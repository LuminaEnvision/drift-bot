import type { FastifyInstance } from "fastify";
import { prisma } from "@drift-bot/db";
import { runAudit } from "@drift-bot/audit-engine";
import { GithubRepoError, fetchPublicRepo, parseRepoRef, withClonedRepo } from "@drift-bot/github-client";
import type { AuditKind, AuditReport, ConnectedRepo, StackKind } from "@drift-bot/types";
import { canConnectRepo, resolveAccess, TIER_LIMITS, toBillingSnapshot } from "./billing/entitlements.js";
import { HttpError, parseTelegramUserId } from "../http.js";

type TelegramUserBody = {
  telegram_user_id?: unknown;
};

type RepoBody = TelegramUserBody & { repo?: unknown };

type AuditBody = RepoBody & { kind?: unknown };

const AUDIT_KINDS = new Set<AuditKind>(["secrets", "deps", "code", "contracts", "full"]);

function asRepoInput(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "Send a public repo. Like owner/repo");
  }
  const ref = parseRepoRef(value);
  if (!ref) {
    throw new HttpError(400, "That doesn't look like a GitHub repo. Try owner/repo");
  }
  return ref.fullName;
}

function asAuditKind(value: unknown): AuditKind {
  const kind = String(value ?? "");
  if (!AUDIT_KINDS.has(kind as AuditKind)) {
    throw new HttpError(400, "Pick secrets, deps, code, contracts, or full.");
  }
  return kind as AuditKind;
}

async function loadUser(telegramUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { telegramUserId },
  });
  if (!user) {
    throw new HttpError(404, "I don't know you yet. Send /start first.");
  }
  return user;
}

function toConnectedRepo(
  repo: {
    id: string;
    fullName: string;
    defaultBranch: string;
    source: string;
    isActive: boolean;
    stackFingerprint: unknown;
    dailyRuns?: Array<{ ranAt: Date }>;
  },
  cadence: "daily" | "weekly",
): ConnectedRepo {
  return {
    id: repo.id,
    full_name: repo.fullName,
    default_branch: repo.defaultBranch,
    source: repo.source === "github_app" ? "github_app" : "public",
    stacks: stacksFromFingerprint(repo.stackFingerprint),
    is_active: repo.isActive,
    check_frequency: cadence,
    last_checked_at: repo.dailyRuns?.[0]?.ranAt.toISOString() ?? null,
  };
}

function stacksFromFingerprint(value: unknown): StackKind[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const stacks = (value as { stacks?: Array<{ kind?: string }> }).stacks;
  if (!Array.isArray(stacks)) {
    return [];
  }
  const allowed = new Set<StackKind>(["evm", "solana", "node", "python", "rust"]);
  return stacks
    .map((stack) => stack.kind)
    .filter((kind): kind is StackKind => typeof kind === "string" && allowed.has(kind as StackKind));
}

export async function registerRepoRoutes(app: FastifyInstance) {
  app.get<{ Params: { telegramUserId: string } }>("/users/:telegramUserId/repos", async (request) => {
    const telegramUserId = parseTelegramUserId(request.params.telegramUserId);
    const user = await loadUser(telegramUserId);
    const cadence = TIER_LIMITS[resolveAccess(user).tier].digest;
    const repos = await prisma.repo.findMany({
      where: { userId: user.id, isActive: true },
      include: { dailyRuns: { orderBy: { ranAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
    });
    return { repos: repos.map((repo) => toConnectedRepo(repo, cadence)) };
  });

  app.post<{ Body: RepoBody }>("/repos/connect", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const rawName = asRepoInput(request.body?.repo);
    const user = await loadUser(telegramUserId);
    const access = resolveAccess(user);
    const snapshot = toBillingSnapshot(user);

    let remote;
    try {
      const ref = parseRepoRef(rawName);
      if (!ref) {
        throw new HttpError(400, "That doesn't look like a GitHub repo. Try owner/repo");
      }
      remote = await fetchPublicRepo(ref.owner, ref.name);
    } catch (error) {
      if (error instanceof GithubRepoError) {
        throw new HttpError(error.code === "upstream" ? 502 : 400, error.message);
      }
      throw error;
    }

    const existing = await prisma.repo.findUnique({
      where: { userId_fullName: { userId: user.id, fullName: remote.fullName } },
    });

    const activeCount = await prisma.repo.count({
      where: { userId: user.id, isActive: true },
    });
    if (!existing?.isActive) {
      const blocked = canConnectRepo(activeCount, snapshot.limits.repos);
      if (blocked) {
        throw new HttpError(409, blocked);
      }
    }

    const repo = await prisma.repo.upsert({
      where: { userId_fullName: { userId: user.id, fullName: remote.fullName } },
      create: {
        userId: user.id,
        fullName: remote.fullName,
        defaultBranch: remote.defaultBranch,
        source: "public",
        isActive: true,
        stackFingerprint: { stacks: remote.stacks },
        checkFrequency: access.tier === "free" ? "weekly" : "daily",
      },
      update: {
        isActive: true,
        defaultBranch: remote.defaultBranch,
        stackFingerprint: { stacks: remote.stacks },
        source: "public",
      },
    });

    return { repo: toConnectedRepo(repo, TIER_LIMITS[access.tier].digest) };
  });

  app.post<{ Body: RepoBody }>("/repos/disconnect", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const rawName = asRepoInput(request.body?.repo);
    const user = await loadUser(telegramUserId);
    const repo = await prisma.repo.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        fullName: { equals: rawName, mode: "insensitive" },
      },
    });
    if (!repo) {
      throw new HttpError(404, "I'm not watching that repo.");
    }
    await prisma.repo.update({
      where: { id: repo.id },
      data: { isActive: false },
    });
    return { ok: true, repo: toConnectedRepo({ ...repo, isActive: false }, TIER_LIMITS[resolveAccess(user).tier].digest) };
  });

  app.post<{ Body: AuditBody }>("/repos/audit", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const kind = asAuditKind(request.body?.kind);
    const user = await loadUser(telegramUserId);
    const active = await prisma.repo.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (active.length === 0) {
      throw new HttpError(400, "Connect a repo first. Try /connect owner/repo");
    }

    let repo = active[0];
    if (typeof request.body?.repo === "string" && request.body.repo.trim()) {
      const wanted = asRepoInput(request.body.repo);
      const match = active.find((item) => item.fullName.toLowerCase() === wanted.toLowerCase());
      if (!match) {
        throw new HttpError(404, "I'm not watching that repo. /repos to see what I have.");
      }
      repo = match;
    } else if (active.length > 1) {
      throw new HttpError(400, "You've got a few repos. Tell me which one: /audit_deps owner/repo");
    }

    let report: AuditReport;
    try {
      report = await withClonedRepo(repo.fullName, (repoPath) => runAudit(kind, repoPath, repo.fullName));
    } catch (error) {
      request.log.error(error);
      throw new HttpError(502, "Couldn't clone that repo. GitHub might be slow. Try again.");
    }

    await prisma.researchRun.create({
      data: {
        repoId: repo.id,
        userId: user.id,
        command: kind === "full" ? "/audit" : `/audit_${kind}`,
        inputParams: { kind, full_name: repo.fullName },
        resultText: report.findings.map((finding) => finding.message).join("\n"),
      },
    });

    return { report };
  });
}

import type { FastifyInstance } from "fastify";
import { prisma } from "@drift-bot/db";
import { runCheapPass } from "@drift-bot/audit-engine";
import { fetchCiStatus, parseRepoRef, withClonedRepo } from "@drift-bot/github-client";
import type { DigestReport, Plan } from "@drift-bot/types";
import { resolveAccess, TIER_LIMITS } from "./billing/entitlements.js";
import { digestChanged, diffFindings, isDigestDue, parseStoredDigest, type StoredDigest } from "./digest/logic.js";
import { HttpError, parseTelegramUserId } from "../http.js";

type TelegramUserBody = {
  telegram_user_id?: unknown;
};

type DigestBody = TelegramUserBody & { repo?: unknown };

const BATCH = Math.max(1, Number(process.env.DIGEST_BATCH ?? 5) || 5);

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

function cadenceFor(user: { tier: string; tierExpiresAt: Date | null; trialEndsAt: Date | null }): "daily" | "weekly" {
  return TIER_LIMITS[resolveAccess(user).tier].digest;
}

function tierRank(tier: Plan): number {
  if (tier === "premium") {
    return 0;
  }
  if (tier === "paid") {
    return 1;
  }
  return 2;
}

function telegramId(value: bigint): number {
  return Number(value);
}

export async function registerDigestRoutes(app: FastifyInstance) {
  app.post<{ Body: DigestBody }>("/digest/run", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const user = await prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) {
      throw new HttpError(404, "I don't know you yet. Send /start first.");
    }

    const active = await prisma.repo.findMany({
      where: { userId: user.id, isActive: true },
      include: { dailyRuns: { orderBy: { ranAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
    });
    if (active.length === 0) {
      throw new HttpError(400, "Connect a repo first. Try /connect owner/repo");
    }

    let selected = active;
    if (typeof request.body?.repo === "string" && request.body.repo.trim()) {
      const wanted = asRepoInput(request.body.repo);
      const match = active.find((item) => item.fullName.toLowerCase() === wanted.toLowerCase());
      if (!match) {
        throw new HttpError(404, "I'm not watching that repo. /repos to see what I have.");
      }
      selected = [match];
    }

    const cadence = cadenceFor(user);
    const reports: DigestReport[] = [];
    for (const repo of selected) {
      try {
        reports.push(await runAndStore(repo, cadence, true));
      } catch (error) {
        request.log.error(error);
        throw new HttpError(502, `Couldn't check ${repo.fullName}. GitHub might be slow. Try again.`);
      }
    }
    return { reports };
  });

  app.post("/digest/tick", async (request) => {
    const repos = await prisma.repo.findMany({
      where: { isActive: true },
      include: {
        user: true,
        dailyRuns: { orderBy: { ranAt: "desc" }, take: 1 },
      },
    });

    const due = repos
      .map((repo) => {
        const access = resolveAccess(repo.user);
        const cadence = TIER_LIMITS[access.tier].digest;
        const last = repo.dailyRuns[0]?.ranAt ?? null;
        return { repo, cadence, last, rank: tierRank(access.tier) };
      })
      .filter((item) => isDigestDue(item.last, item.cadence))
      .sort((a, b) => a.rank - b.rank || (a.last?.getTime() ?? 0) - (b.last?.getTime() ?? 0))
      .slice(0, BATCH);

    const deliveries: Array<{ telegram_user_id: number; report: DigestReport }> = [];
    for (const item of due) {
      try {
        const report = await runAndStore(item.repo, item.cadence, false);
        if (report.notified) {
          deliveries.push({
            telegram_user_id: telegramId(item.repo.user.telegramUserId),
            report,
          });
        }
      } catch (error) {
        request.log.error({ err: error, repo: item.repo.fullName }, "digest tick failed");
      }
    }

    return { deliveries, checked: due.length };
  });
}

async function runAndStore(
  repo: {
    id: string;
    fullName: string;
    defaultBranch: string;
    dailyRuns: Array<{ findings: unknown; ranAt: Date }>;
  },
  cadence: "daily" | "weekly",
  forced: boolean,
): Promise<DigestReport> {
  const previous = parseStoredDigest(repo.dailyRuns[0]?.findings);
  const [audit, ci] = await Promise.all([
    withClonedRepo(repo.fullName, (repoPath) => runCheapPass(repoPath, repo.fullName)),
    fetchCiStatus(repo.fullName, repo.defaultBranch),
  ]);

  const notes = audit.results.map((result) => result.message).filter((message): message is string => Boolean(message));
  const stored: StoredDigest = {
    findings: audit.findings,
    ci,
    notes,
  };
  const notified = forced || digestChanged(previous, stored);
  const { new_findings, resolved_findings } = diffFindings(previous?.findings ?? [], stored.findings);

  const saved = await prisma.dailyRun.create({
    data: {
      repoId: repo.id,
      findings: stored,
      summarySent: notified,
    },
  });

  return {
    repo: repo.fullName,
    cadence,
    forced,
    notified,
    last_checked_at: saved.ranAt.toISOString(),
    ci,
    findings: stored.findings,
    new_findings,
    resolved_findings,
    notes,
  };
}

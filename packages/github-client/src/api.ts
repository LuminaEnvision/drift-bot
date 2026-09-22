import type { Stack } from "@drift-bot/types";
import { detectStacksFromNames } from "@drift-bot/stack-detector";

export type PublicRepo = {
  fullName: string;
  defaultBranch: string;
  description: string | null;
  stacks: Stack[];
};

export type CiStatus = {
  ok: boolean;
  conclusion?: string;
  url?: string;
  message: string;
};

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DriftBot",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export class GithubRepoError extends Error {
  constructor(
    public code: "not_found" | "private" | "upstream",
    message: string,
  ) {
    super(message);
    this.name = "GithubRepoError";
  }
}

type GithubRepoJson = {
  full_name?: string;
  default_branch?: string;
  private?: boolean;
  description?: string | null;
  message?: string;
};

type GithubContentJson = {
  name: string;
  type: string;
};

export async function fetchPublicRepo(owner: string, name: string): Promise<PublicRepo> {
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
    headers: githubHeaders(),
  });

  if (repoResponse.status === 404) {
    throw new GithubRepoError(
      "not_found",
      "I can't find that repo. Check the name and make sure it's public.",
    );
  }
  if (!repoResponse.ok) {
    throw new GithubRepoError("upstream", "GitHub didn't answer. Try again in a minute.");
  }

  const repo = (await repoResponse.json()) as GithubRepoJson;
  if (repo.private) {
    throw new GithubRepoError("private", "That repo is private. I can only audit public repos for now.");
  }

  const fullName = repo.full_name ?? `${owner}/${name}`;
  const names = await listRemoteNames(fullName);
  return {
    fullName,
    defaultBranch: repo.default_branch ?? "main",
    description: repo.description ?? null,
    stacks: detectStacksFromNames(names),
  };
}

async function listRemoteNames(fullName: string): Promise<string[]> {
  const names: string[] = [];
  const root = await listContents(fullName);
  for (const entry of root) {
    names.push(entry.name);
  }

  const contracts = root.find((entry) => entry.name === "contracts" && entry.type === "dir");
  if (contracts) {
    const nested = await listContents(fullName, "contracts");
    for (const entry of nested) {
      names.push(`contracts/${entry.name}`);
    }
  }

  return names;
}

async function listContents(fullName: string, path = ""): Promise<GithubContentJson[]> {
  const suffix = path ? `/${path}` : "";
  const response = await fetch(`https://api.github.com/repos/${fullName}/contents${suffix}`, {
    headers: githubHeaders(),
  });
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as GithubContentJson[] | { message?: string };
  return Array.isArray(body) ? body : [];
}

export async function fetchCiStatus(fullName: string, branch: string): Promise<CiStatus> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${fullName}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=1`,
      { headers: githubHeaders() },
    );
    if (!response.ok) {
      return { ok: true, message: `Couldn't read CI on ${branch}. GitHub didn't answer.` };
    }
    const body = (await response.json()) as {
      workflow_runs?: Array<{
        conclusion: string | null;
        html_url: string;
        status: string;
      }>;
    };
    const run = body.workflow_runs?.[0];
    if (!run) {
      return { ok: true, message: `No GitHub Actions runs on ${branch} that I can see.` };
    }
    if (run.status !== "completed") {
      return {
        ok: true,
        conclusion: run.status,
        url: run.html_url,
        message: `CI is still ${run.status} on ${branch}.`,
      };
    }
    const ok =
      run.conclusion === "success" || run.conclusion === "skipped" || run.conclusion === "neutral";
    return {
      ok,
      conclusion: run.conclusion ?? undefined,
      url: run.html_url,
      message: ok ? `CI passed on ${branch}.` : `CI ${run.conclusion} on ${branch}.`,
    };
  } catch {
    return { ok: true, message: `Couldn't read CI on ${branch}.` };
  }
}

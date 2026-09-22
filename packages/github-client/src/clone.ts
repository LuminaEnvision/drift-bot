import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parseRepoRef } from "./parse.js";

const execFileAsync = promisify(execFile);

export async function withClonedRepo<T>(fullName: string, fn: (repoPath: string) => Promise<T>): Promise<T> {
  const ref = parseRepoRef(fullName);
  if (!ref) {
    throw new Error("Bad repo name.");
  }

  const dest = await mkdtemp(join(tmpdir(), "drift-repo-"));
  const url = `https://github.com/${ref.owner}/${ref.name}.git`;
  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--single-branch", url, dest], {
      timeout: 45_000,
    });
    return await fn(dest);
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
}

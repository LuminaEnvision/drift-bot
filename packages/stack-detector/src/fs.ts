import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readTextIfExists(repoPath: string, relative: string): string | null {
  const full = join(repoPath, relative);
  if (!existsSync(full)) {
    return null;
  }
  return readFileSync(full, "utf8");
}

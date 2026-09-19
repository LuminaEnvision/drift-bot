import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Stack } from "@drift-bot/types";

export function detectNode(repoPath: string): Stack[] {
  if (!existsSync(join(repoPath, "package.json"))) {
    return [];
  }
  return [{ kind: "node", evidence: ["package.json"] }];
}

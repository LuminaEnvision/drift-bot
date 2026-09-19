import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Stack } from "@drift-bot/types";

const MARKERS = ["requirements.txt", "pyproject.toml", "Pipfile"];

export function detectPython(repoPath: string): Stack[] {
  const evidence = MARKERS.filter((file) => existsSync(join(repoPath, file)));
  return evidence.length > 0 ? [{ kind: "python", evidence }] : [];
}

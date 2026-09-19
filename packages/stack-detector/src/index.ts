import type { Stack } from "@drift-bot/types";
import { detectEvm } from "./evm/index.js";
import { detectNode } from "./node/index.js";
import { detectPython } from "./python/index.js";
import { detectRust } from "./rust/index.js";

export type { Stack };

/** Additive: a repo can be node + evm + solana at once. */
export function detectStacks(repoPath: string): Stack[] {
  return [...detectNode(repoPath), ...detectPython(repoPath), ...detectRust(repoPath), ...detectEvm(repoPath)];
}

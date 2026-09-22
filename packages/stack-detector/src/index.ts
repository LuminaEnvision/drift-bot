import type { Stack } from "@drift-bot/types";
import { detectEvm } from "./evm/index.js";
import { detectNode } from "./node/index.js";
import { detectPython } from "./python/index.js";
import { detectRust } from "./rust/index.js";

export type { Stack };

const EVM_MARKERS = ["foundry.toml", "hardhat.config.js", "hardhat.config.ts", "hardhat.config.mjs"];
const PYTHON_MARKERS = ["requirements.txt", "pyproject.toml", "Pipfile"];

/** Additive: a repo can be node + evm + solana at once. */
export function detectStacks(repoPath: string): Stack[] {
  return [...detectNode(repoPath), ...detectPython(repoPath), ...detectRust(repoPath), ...detectEvm(repoPath)];
}

/** Used on connect when we only have GitHub root (and maybe contracts/) names. */
export function detectStacksFromNames(names: string[]): Stack[] {
  const set = new Set(names);
  const stacks: Stack[] = [];

  if (set.has("package.json")) {
    stacks.push({ kind: "node", evidence: ["package.json"] });
  }

  const python = PYTHON_MARKERS.filter((file) => set.has(file));
  if (python.length > 0) {
    stacks.push({ kind: "python", evidence: python });
  }

  if (set.has("Cargo.toml")) {
    stacks.push({ kind: "rust", evidence: ["Cargo.toml"] });
  }
  if (set.has("Anchor.toml") || names.some((name) => /anchor-lang|solana-program/.test(name))) {
    stacks.push({ kind: "solana", evidence: names.filter((name) => name === "Anchor.toml" || name === "Cargo.toml") });
  }

  const evm = EVM_MARKERS.filter((file) => set.has(file));
  if (names.some((name) => name.endsWith(".sol") || name === "contracts" || name.startsWith("contracts/"))) {
    evm.push(".sol");
  }
  if (evm.length > 0) {
    stacks.push({ kind: "evm", evidence: evm });
  }

  return stacks;
}

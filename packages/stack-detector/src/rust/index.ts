import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Stack } from "@drift-bot/types";
import { readTextIfExists } from "../fs.js";

/**
 * Rust + optional Solana flag.
 * Anchor.toml, or Cargo.toml depending on anchor-lang / solana-program, marks Solana.
 * Generic Cargo.toml without those deps is rust only. Solana audit itself is v2.
 */
export function detectRust(repoPath: string): Stack[] {
  const stacks: Stack[] = [];
  const cargo = existsSync(join(repoPath, "Cargo.toml"));
  if (cargo) {
    stacks.push({ kind: "rust", evidence: ["Cargo.toml"] });
  }

  const evidence: string[] = [];
  if (existsSync(join(repoPath, "Anchor.toml"))) {
    evidence.push("Anchor.toml");
  }
  const cargoToml = readTextIfExists(repoPath, "Cargo.toml") ?? "";
  if (/anchor-lang|solana-program/.test(cargoToml)) {
    evidence.push("Cargo.toml solana deps");
  }
  if (evidence.length > 0) {
    stacks.push({ kind: "solana", evidence });
  }
  return stacks;
}

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Stack } from "@drift-bot/types";

const EVM_MARKERS = ["foundry.toml", "hardhat.config.js", "hardhat.config.ts", "hardhat.config.mjs"];

export function detectEvm(repoPath: string): Stack[] {
  const evidence = EVM_MARKERS.filter((file) => existsSync(join(repoPath, file)));
  if (existsSync(join(repoPath, "contracts")) && evidence.length === 0) {
    // .sol files alone are not enough without a toolchain marker; keep additive via foundry/hardhat only
  }
  return evidence.length > 0 ? [{ kind: "evm", evidence }] : [];
}

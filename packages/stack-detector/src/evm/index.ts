import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Stack } from "@drift-bot/types";

const EVM_MARKERS = ["foundry.toml", "hardhat.config.js", "hardhat.config.ts", "hardhat.config.mjs"];

function hasSolidity(dir: string, depth = 0): boolean {
  if (depth > 2 || !existsSync(dir)) {
    return false;
  }
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".sol")) {
        return true;
      }
      if (entry.isDirectory() && !entry.name.startsWith(".") && hasSolidity(join(dir, entry.name), depth + 1)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function detectEvm(repoPath: string): Stack[] {
  const evidence = EVM_MARKERS.filter((file) => existsSync(join(repoPath, file)));
  if (hasSolidity(join(repoPath, "contracts")) || hasSolidity(join(repoPath, "src"))) {
    evidence.push(".sol");
  }
  return evidence.length > 0 ? [{ kind: "evm", evidence }] : [];
}

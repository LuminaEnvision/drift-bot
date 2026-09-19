import { detectStacks } from "@drift-bot/stack-detector";
import type { AuditResult } from "@drift-bot/types";
import { runContractAudit as runEvmContractAudit } from "./evm/index.js";
import { runContractAudit as runSolanaContractAudit } from "./solana/index.js";

/**
 * Routes by stack-detector output. EVM and Solana can both run on one repo.
 * Solana currently returns a v2 stub result instead of throwing, so mixed repos
 * still get the EVM pass.
 */
export async function runContractAudits(repoPath: string): Promise<AuditResult[]> {
  const stacks = detectStacks(repoPath);
  const results: AuditResult[] = [];

  if (stacks.some((stack) => stack.kind === "evm")) {
    results.push(await runEvmContractAudit(repoPath));
  }
  if (stacks.some((stack) => stack.kind === "solana")) {
    results.push(await runSolanaContractAudit(repoPath));
  }

  if (results.length === 0) {
    return [
      {
        tool: "contracts",
        ok: true,
        message: "No contract stack detected",
        findings: [],
      },
    ];
  }

  return results;
}

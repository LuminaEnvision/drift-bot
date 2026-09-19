import type { AuditResult } from "@drift-bot/types";

/**
 * Solana contract auditing ships in v2.
 * Same interface as the EVM module so `contracts/index.ts` can call both.
 */
export async function runContractAudit(_repoPath: string): Promise<AuditResult> {
  return {
    tool: "solana",
    ok: false,
    unsupported: true,
    message: "not yet supported — Solana contract auditing ships in v2",
    findings: [],
  };
}

import type { AuditResult } from "@drift-bot/types";

/** Slither wrapper — CLI not invoked yet; interface is stable for v1. */
export async function runContractAudit(_repoPath: string): Promise<AuditResult> {
  return {
    tool: "slither",
    ok: false,
    unsupported: true,
    message: "Slither wrapper not wired yet",
    findings: [],
  };
}

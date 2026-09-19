import type { AuditResult } from "@drift-bot/types";

/** Dependency CVE / outdated check — not wired in this reorg. */
export async function runDepsAudit(_repoPath: string): Promise<AuditResult> {
  return {
    tool: "deps",
    ok: false,
    unsupported: true,
    message: "Dependency audit not wired yet",
    findings: [],
  };
}

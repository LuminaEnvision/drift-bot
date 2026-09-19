import type { AuditResult } from "@drift-bot/types";

/** Semgrep wrapper — not wired in this reorg. */
export async function runCodeAudit(_repoPath: string): Promise<AuditResult> {
  return {
    tool: "semgrep",
    ok: false,
    unsupported: true,
    message: "Semgrep wrapper not wired yet",
    findings: [],
  };
}

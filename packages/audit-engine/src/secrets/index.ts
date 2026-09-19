import type { AuditResult } from "@drift-bot/types";

/** Gitleaks wrapper — not wired in this reorg. */
export async function runSecretsAudit(_repoPath: string): Promise<AuditResult> {
  return {
    tool: "gitleaks",
    ok: false,
    unsupported: true,
    message: "Gitleaks wrapper not wired yet",
    findings: [],
  };
}

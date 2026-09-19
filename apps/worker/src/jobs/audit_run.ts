import { runCodeAudit, runContractAudits, runDepsAudit, runSecretsAudit } from "@drift-bot/audit-engine";

export type AuditKind = "secrets" | "deps" | "code" | "contracts";

/** Generic clone → run tool → parse → format job — not wired. */
export async function runAuditJob(kind: AuditKind, repoPath: string) {
  switch (kind) {
    case "secrets":
      return runSecretsAudit(repoPath);
    case "deps":
      return runDepsAudit(repoPath);
    case "code":
      return runCodeAudit(repoPath);
    case "contracts":
      return runContractAudits(repoPath);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

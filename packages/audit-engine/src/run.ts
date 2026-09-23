import type { AuditKind, AuditFinding, AuditReport, AuditResult } from "@drift-bot/types";
import { runCodeAudit } from "./code/index.js";
import { runContractAudits } from "./contracts/index.js";
import { runDepsAudit } from "./deps/index.js";
import { runSecretsAudit } from "./secrets/index.js";
import { runSurfaceAudit } from "./surface/index.js";

const SEVERITY_RANK: Record<AuditFinding["severity"], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  info: 3,
};

export async function runCheapPass(repoPath: string, repo: string): Promise<AuditReport> {
  const results = await Promise.all([runDepsAudit(repoPath), runSurfaceAudit(repoPath)]);
  const findings = results
    .flatMap((result) => result.findings)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  return { repo, kind: "deps", results, findings };
}

export async function runAudit(kind: AuditKind, repoPath: string, repo: string): Promise<AuditReport> {
  const results: AuditResult[] = [];

  if (kind === "secrets" || kind === "full") {
    results.push(await runSecretsAudit(repoPath));
  }
  if (kind === "deps" || kind === "full") {
    results.push(await runDepsAudit(repoPath));
  }
  if (kind === "code" || kind === "full") {
    results.push(await runCodeAudit(repoPath));
  }
  if (kind === "contracts" || kind === "full") {
    results.push(...(await runContractAudits(repoPath)));
  }
  if (kind === "surface" || kind === "full") {
    results.push(await runSurfaceAudit(repoPath));
  }

  const findings = results
    .flatMap((result) => result.findings)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return { repo, kind, results, findings };
}

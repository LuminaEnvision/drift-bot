import type { AuditFinding, AuditReport, ConnectedRepo } from "@drift-bot/types";

const KIND_TITLE: Record<AuditReport["kind"], string> = {
  secrets: "Secrets",
  deps: "Dependencies",
  code: "Code",
  contracts: "Contracts",
  full: "Break before launch",
};

export function formatRepoList(repos: ConnectedRepo[]): string {
  if (repos.length === 0) {
    return "No repos yet. Send /connect owner/repo\nPublic GitHub repos only for now.";
  }

  const lines = repos.map((repo) => {
    const stack = repo.stacks.length > 0 ? repo.stacks.join(", ") : "stack unknown";
    return `${repo.full_name} (${repo.default_branch})\n${stack}`;
  });

  return `You're watching ${repos.length} repo${repos.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}\n\n/audit_secrets, /audit_deps, /audit_code, /audit_contracts, or /audit`;
}

export function formatConnected(repo: ConnectedRepo): string {
  const stack = repo.stacks.length > 0 ? ` Looks like ${repo.stacks.join(", ")}.` : "";
  return `Got it. I'm watching ${repo.full_name} (${repo.default_branch}).${stack}

/audit_secrets  leaked keys
/audit_deps  CVEs
/audit_code  risky patterns
/audit_contracts  Solidity
/audit  all of it, break before launch`;
}

export function formatAuditReport(report: AuditReport): string {
  const title =
    report.kind === "full"
      ? `Break before launch on ${report.repo}`
      : `${KIND_TITLE[report.kind]} check on ${report.repo}`;

  const actionable = report.findings.filter((finding) => finding.severity !== "info");
  const notes = report.results.map((result) => result.message).filter(Boolean);

  if (actionable.length === 0) {
    const extra = notes.length > 0 ? `\n\n${notes.join("\n")}` : "";
    return `${title}\n\nCame back clean.${extra}`;
  }

  const shown = report.findings.slice(0, 15);
  const more = report.findings.length - shown.length;
  const body = shown.map((finding) => formatFinding(finding)).join("\n\n");
  const footer =
    report.kind === "full"
      ? "\n\nFix every P0 before you ship."
      : more > 0
        ? `\n\n${more} more. Ask a tighter command if this is noisy.`
        : "";

  return `${title}\n\n${actionable.length} finding${actionable.length === 1 ? "" : "s"}\n\n${body}${footer}`;
}

function formatFinding(finding: AuditFinding): string {
  const where = finding.file ? `  ${finding.file}${finding.line ? `:${finding.line}` : ""}` : "";
  return `${finding.severity}  ${finding.message}${where}`;
}

export function chunkTelegram(text: string, max = 3900): string[] {
  if (text.length <= max) {
    return [text];
  }
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max / 2) {
      cut = max;
    }
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) {
    chunks.push(rest);
  }
  return chunks;
}

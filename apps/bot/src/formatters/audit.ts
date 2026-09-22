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
    const cadence = repo.check_frequency === "weekly" ? "weekly digest" : "daily digest";
    return `${repo.full_name} (${repo.default_branch})\n${stack}. ${cadence}, last check ${ago(repo.last_checked_at)}.`;
  });

  return `You're watching ${repos.length} repo${repos.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}\n\n/digest for today's cheap check. /audit for the full pass.`;
}

export function formatConnected(repo: ConnectedRepo): string {
  const stack = repo.stacks.length > 0 ? ` Looks like ${repo.stacks.join(", ")}.` : "";
  const cadence = repo.check_frequency === "weekly" ? "once a week" : "every day";
  return `Got it. I'm watching ${repo.full_name} (${repo.default_branch}).${stack}
I'll run a cheap CVE and CI check ${cadence}, and message you when something changes.

/digest  run that check now
/audit  full pass, break before launch`;
}

function ago(iso: string | null): string {
  if (!iso) {
    return "never";
  }
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatAuditReport(report: AuditReport): string {
  const title =
    report.kind === "full"
      ? `Break before launch on ${report.repo}`
      : `${KIND_TITLE[report.kind]} check on ${report.repo}`;

  const actionable = report.findings.filter((finding) => finding.severity !== "info");
  const notes = report.results.map((result) => result.message).filter(Boolean);

  const files =
    report.kind === "full"
      ? "Full list is in the PDF and the .md. Open the .md, copy all of it, paste into Cursor."
      : "Want the downloadable report? /audit runs the full pass and sends a PDF.";

  if (actionable.length === 0) {
    const extra = notes.length > 0 ? `\n\n${notes.join("\n")}` : "";
    return `${title}\n\nCame back clean.${extra}\n\n${files}`;
  }

  const shown = report.findings.slice(0, 8);
  const more = report.findings.length - shown.length;
  const body = shown.map((finding) => formatFinding(finding)).join("\n\n");
  const leftover = more > 0 ? `\n\n${more} more. Run /audit if you want the full file.` : "";
  const launch = report.kind === "full" ? "\n\nFix every P0 before you ship." : "";

  return `${title}\n\n${actionable.length} finding${actionable.length === 1 ? "" : "s"}\n\n${body}${leftover}${launch}\n\n${files}`;
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

import type { AuditFinding, DigestReport } from "@drift-bot/types";

export function formatDigest(report: DigestReport): string {
  const cadence = report.cadence === "weekly" ? "weekly" : "daily";
  const lines = [`Digest for ${report.repo} (${cadence})`, "", report.ci.message];

  const actionable = report.findings.filter((finding) => finding.severity !== "info");
  if (report.notes.length > 0 && actionable.length === 0) {
    lines.push(report.notes[0]);
  }

  if (report.new_findings.length > 0) {
    lines.push("", `${report.new_findings.length} new since last time`);
    lines.push(report.new_findings.slice(0, 8).map(formatFinding).join("\n"));
  } else if (actionable.length > 0) {
    lines.push("", `${actionable.length} open finding${actionable.length === 1 ? "" : "s"}`);
    lines.push(actionable.slice(0, 8).map(formatFinding).join("\n"));
  }

  if (report.resolved_findings.length > 0) {
    lines.push("", `${report.resolved_findings.length} cleared since last time`);
    lines.push(report.resolved_findings.slice(0, 5).map(formatFinding).join("\n"));
  }

  if (actionable.length === 0 && report.ci.ok) {
    lines.push("", "Came back clean. I'll ping you when a CVE shows up, CI goes red, or the public site door changes.");
  } else {
    lines.push("", "Want the full pass? /audit");
  }

  if (report.forced && !report.new_findings.length && !report.resolved_findings.length && actionable.length === 0) {
    lines.push(
      report.cadence === "weekly"
        ? "Next automatic check is in a week on Free."
        : "Next automatic check is in a day.",
    );
  }

  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}

function formatFinding(finding: AuditFinding): string {
  const where = finding.file ? `  ${finding.file}${finding.line ? `:${finding.line}` : ""}` : "";
  return `${finding.severity}  ${finding.message}${where}`;
}

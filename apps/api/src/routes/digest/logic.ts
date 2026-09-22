import type { AuditFinding, DigestCi } from "@drift-bot/types";

export type StoredDigest = {
  findings: AuditFinding[];
  ci: DigestCi;
  notes: string[];
};

const DAY_MS = 86_400_000;

export function isDigestDue(
  lastRanAt: Date | null,
  cadence: "daily" | "weekly",
  now = new Date(),
): boolean {
  if (!lastRanAt) {
    return true;
  }
  const wait = cadence === "weekly" ? 7 * DAY_MS : DAY_MS;
  return now.getTime() - lastRanAt.getTime() >= wait;
}

export function digestFingerprint(stored: StoredDigest): string {
  const findings = stored.findings
    .filter((finding) => finding.severity !== "info")
    .map((finding) => `${finding.severity}|${finding.tool}|${finding.message}|${finding.file ?? ""}`)
    .sort()
    .join("\n");
  const ci = stored.ci.ok ? "ci:ok" : `ci:${stored.ci.message}`;
  return `${ci}\n${findings}`;
}

export function digestChanged(previous: StoredDigest | null, next: StoredDigest): boolean {
  if (!previous) {
    return true;
  }
  return digestFingerprint(previous) !== digestFingerprint(next);
}

export function diffFindings(
  previous: AuditFinding[],
  next: AuditFinding[],
): { new_findings: AuditFinding[]; resolved_findings: AuditFinding[] } {
  const prevKeys = new Set(previous.filter(actionable).map(findingKey));
  const nextKeys = new Set(next.filter(actionable).map(findingKey));
  return {
    new_findings: next.filter((finding) => actionable(finding) && !prevKeys.has(findingKey(finding))),
    resolved_findings: previous.filter(
      (finding) => actionable(finding) && !nextKeys.has(findingKey(finding)),
    ),
  };
}

export function parseStoredDigest(value: unknown): StoredDigest | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<StoredDigest>;
  if (!Array.isArray(raw.findings) || !raw.ci || typeof raw.ci.message !== "string") {
    return null;
  }
  return {
    findings: raw.findings,
    ci: {
      ok: Boolean(raw.ci.ok),
      conclusion: raw.ci.conclusion,
      url: raw.ci.url,
      message: raw.ci.message,
    },
    notes: Array.isArray(raw.notes) ? raw.notes.filter((note) => typeof note === "string") : [],
  };
}

function actionable(finding: AuditFinding): boolean {
  return finding.severity !== "info";
}

function findingKey(finding: AuditFinding): string {
  return `${finding.severity}|${finding.tool}|${finding.message}|${finding.file ?? ""}|${finding.line ?? ""}`;
}

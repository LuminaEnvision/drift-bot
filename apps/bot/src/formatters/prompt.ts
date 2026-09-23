import type { AuditFinding, AuditReport } from "@drift-bot/types";

const KIND_LABEL: Record<AuditReport["kind"], string> = {
  secrets: "secrets (leaked keys)",
  deps: "dependencies (known CVEs)",
  code: "code (risky patterns)",
  contracts: "contracts (Solidity footguns)",
  surface: "surface (public site door check)",
  full: "Break before launch (full pass)",
};

const ORDER: AuditFinding["severity"][] = ["P0", "P1", "P2", "info"];

export function formatAgentPrompt(report: AuditReport): string {
  const date = new Date().toISOString().slice(0, 10);
  const groups = groupBySeverity(report.findings);
  const p0 = groups.P0.length;
  const notes = report.results.map((result) => result.message).filter(Boolean);

  const findingBlocks = ORDER.flatMap((severity) => {
    const items = groups[severity];
    if (items.length === 0) {
      return [];
    }
    const heading =
      severity === "info"
        ? `## Info (${items.length})`
        : `## ${severity} (${items.length})  ${severity === "P0" ? "fix every one of these before you ship" : ""}`.trim();
    const body = items
      .map((finding, index) => formatFindingBlock(index + 1, finding, report.repo))
      .join("\n\n");
    return [`${heading}\n\n${body}`];
  });

  const findingsSection =
    report.findings.length === 0
      ? "## Findings\n\nNo findings from this pass. Still do a human pass on auth, payments, and anything that can lose user data."
      : findingBlocks.join("\n\n");

  const scannerNotes =
    notes.length > 0 ? `## Scanner notes\n\n${notes.map((note) => `- ${note}`).join("\n")}\n` : "";

  return `Drift Bot audit report
Repo: ${report.repo}
Check: ${KIND_LABEL[report.kind]}
Date: ${date}
Findings: ${report.findings.length} total, ${p0} P0

You are a senior engineer working in the GitHub repo ${report.repo}.
Treat it as Break before launch. Find real bugs, patch them in the repo, and do not write a slide deck.

Rules:
- Finding count is not patch count. A deps line is one version bump even if it lists many advisory IDs.
- Fix every P0 before you stop. There ${p0 === 1 ? "is" : "are"} ${p0} P0 item${p0 === 1 ? "" : "s"} below.
- Then fix real P1s. Then P2. Info is optional.
- Open each file and confirm the finding is real before you change it.
- If a finding is a false positive, say so in one line and skip it.
- Prefer a small, safe patch over a rewrite.
- Do not open one PR per CVE ID. Do not redeploy Solidity just to silence .call{value} or block.timestamp.
- After each P0, say the file you changed and what you did.
- Do not print secrets. Rotate anything that looks like a live key and remove it from git.
- Reply in three buckets: Fix now, Skip (why), Later.

${scannerNotes}${findingsSection}

## How to work
1. Open the repo ${report.repo} (clone if you do not have it locally).
2. Work through P0 top to bottom.
3. Run the tests or the closest check this stack has.
4. Reply with: what you fixed, what you skipped, and what is still risky.

Copy everything above this line into Cursor (or your agent) and run it against ${report.repo}.
`;
}

function groupBySeverity(findings: AuditFinding[]): Record<AuditFinding["severity"], AuditFinding[]> {
  const groups: Record<AuditFinding["severity"], AuditFinding[]> = {
    P0: [],
    P1: [],
    P2: [],
    info: [],
  };
  for (const finding of findings) {
    groups[finding.severity].push(finding);
  }
  return groups;
}

function formatFindingBlock(index: number, finding: AuditFinding, repo: string): string {
  const where = finding.file
    ? `${finding.file}${finding.line ? `:${finding.line}` : ""}`
    : "location unknown";
  const link = finding.file
    ? `https://github.com/${repo}/blob/HEAD/${finding.file.replace(/^\/+/, "")}${finding.line ? `#L${finding.line}` : ""}`
    : "no file link";
  const extra = extraForFinding(finding);
  return `${index}. [${finding.tool} / ${finding.severity}] ${finding.message}
   File: ${where}
   Open: ${link}
   Why: ${extra.why}
   Do: ${extra.task}
   Check: ${extra.check}`;
}

function extraForFinding(finding: AuditFinding): { why: string; task: string; check: string } {
  if (finding.tool === "secrets") {
    return {
      why: "Looks like a credential or secret-looking assignment in git. If it is real, anyone with the repo can use it.",
      task:
        finding.severity === "P0"
          ? "Open the file. If the value is real, rotate it now, remove it from the file, and treat the old value as burned. Do not print the secret."
          : "Open the file. If it is a real secret, rotate it and move it to env. If it is a placeholder or example, say false positive and skip.",
      check: "Search the repo for the same key name. Make sure it is not still in git history or another file.",
    };
  }
  if (finding.tool === "deps") {
    return {
      why: "Known advisories match this package version. Many IDs still mean one bump.",
      task: "Bump that package once (or drop it). Do not open a PR per advisory. Stay on the same major unless the note says you must migrate.",
      check: "Re-run install and tests. Then smoke the main user paths.",
    };
  }
  if (finding.tool === "code") {
    return {
      why: "This pattern can be RCE, XSS, or a data leak. It is also a common false positive on static JSON-LD and UI copy.",
      task: "Read the surrounding code. Patch only if user input can reach it. Skip JSON-LD, escaped print HTML, and strings that are not SQL.",
      check: "Say skip or show the small patch. Do not rewrite the file.",
    };
  }
  if (finding.tool === "surface") {
    return {
      why: "The repo's public homepage is missing a header or is serving a file that should not be public.",
      task: "If a file like .env or .git is public, take it down and rotate secrets. If it is only a missing header, add the header. This is not proof of a live bot attack.",
      check: "Re-fetch the URL. Confirm the file 404s. Do not treat this as a traffic log.",
    };
  }
  if (finding.tool === "contracts" || finding.tool === "evm" || finding.tool === "solana") {
    return {
      why: "Classic Solidity footgun. tx.origin and selfdestruct are usually real. .call{value} and block.timestamp are often intentional.",
      task: "Confirm the call path. If it is a fee payout or an expiry window, skip and say so. Do not redeploy just for the scanner.",
      check: "Only patch if an untrusted caller can abuse it, and you already planned a deploy.",
    };
  }
  return {
    why: "The scanner flagged this as risky.",
    task:
      finding.severity === "P0"
        ? "Confirm it, fix it, and do not leave a TODO."
        : finding.severity === "info"
          ? "Read it. Fix it only if it is cheap and real."
          : "Confirm it and patch it if it is real.",
    check: "Say the file you changed and what you did.",
  };
}

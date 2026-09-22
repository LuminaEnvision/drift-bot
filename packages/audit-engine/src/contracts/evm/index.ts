import type { AuditFinding, AuditResult } from "@drift-bot/types";
import { walkRepoFiles } from "../../walk.js";

type SolRule = {
  severity: AuditFinding["severity"];
  message: string;
  pattern: RegExp;
};

const RULES: SolRule[] = [
  { severity: "P0", message: "tx.origin used for auth. Attackers can pivot through a contract you trust.", pattern: /\btx\.origin\b/ },
  { severity: "P1", message: "delegatecall. Make sure the target and storage layout are intentional.", pattern: /\.delegatecall\s*\(/ },
  { severity: "P1", message: "selfdestruct / suicide", pattern: /\b(?:selfdestruct|suicide)\s*\(/ },
  {
    severity: "P1",
    message:
      "Low-level call with value. Often a fee or treasury payout. Confirm require(success) and CEI. Do not redeploy just to silence this.",
    pattern: /\.call\s*\{[^}]*value/,
  },
  {
    severity: "P2",
    message:
      "block.timestamp. Fine for expiry or windows. Only a bug if it is used as randomness.",
    pattern: /block\.timestamp/,
  },
];

export async function runContractAudit(repoPath: string): Promise<AuditResult> {
  const files = walkRepoFiles(repoPath, new Set([".sol"]));
  if (files.length === 0) {
    return {
      tool: "contracts",
      ok: true,
      message: "No Solidity files. Nothing for me to check here.",
      findings: [],
    };
  }

  const grouped = new Map<string, AuditFinding & { count: number }>();
  for (const file of files) {
    const lines = file.content.split("\n");
    for (const [index, line] of lines.entries()) {
      if (line.trimStart().startsWith("//")) {
        continue;
      }
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          const key = `${file.relativePath}|${rule.message}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.count += 1;
            continue;
          }
          grouped.set(key, {
            severity: rule.severity,
            tool: "contracts",
            message: rule.message,
            file: file.relativePath,
            line: index + 1,
            count: 1,
          });
        }
      }
    }
  }

  const findings: AuditFinding[] = [...grouped.values()].map((item) => ({
    severity: item.severity,
    tool: item.tool,
    message:
      item.count > 1
        ? `${item.message} (${item.count} times in this file, first at line ${item.line})`
        : item.message,
    file: item.file,
    line: item.line,
  }));

  return {
    tool: "contracts",
    ok: true,
    message:
      findings.length === 0
        ? `Checked ${files.length} Solidity file${files.length === 1 ? "" : "s"}. No classic footguns jumped out.`
        : `Found ${findings.length} Solidity issue${findings.length === 1 ? "" : "s"}.`,
    findings,
  };
}

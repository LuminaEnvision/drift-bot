import type { AuditFinding, AuditResult } from "@drift-bot/types";
import { walkRepoFiles } from "../walk.js";

type CodeRule = {
  severity: AuditFinding["severity"];
  message: string;
  pattern: RegExp;
};

const RULES: CodeRule[] = [
  { severity: "P1", message: "eval() or new Function()", pattern: /\beval\s*\(|new Function\s*\(/ },
  { severity: "P1", message: "innerHTML or document.write", pattern: /\.innerHTML\s*=|document\.write\s*\(/ },
  { severity: "P1", message: "dangerouslySetInnerHTML", pattern: /dangerouslySetInnerHTML/ },
  { severity: "P1", message: "child_process exec with a template string", pattern: /(?:exec|execSync|execFileSync)\(\s*`/ },
  { severity: "P1", message: "pickle.loads", pattern: /pickle\.loads\s*\(/ },
  { severity: "P1", message: "yaml.load without a SafeLoader", pattern: /yaml\.load\s*\(/ },
  { severity: "P1", message: "TLS verification turned off", pattern: /NODE_TLS_REJECT_UNAUTHORIZED|verify\s*=\s*False/ },
  { severity: "P2", message: "SQL string built with concatenation or a template", pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+[^;]*['"`]\s*\+|`(?:SELECT|INSERT|UPDATE|DELETE)/i },
];

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".rb", ".php", ".java"]);

export function scanTextForCodeIssues(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = content.split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) {
      continue;
    }
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          severity: rule.severity,
          tool: "code",
          message: rule.message,
          file,
          line: index + 1,
        });
      }
    }
  }
  return findings;
}

export async function runCodeAudit(repoPath: string): Promise<AuditResult> {
  const findings: AuditFinding[] = [];
  for (const file of walkRepoFiles(repoPath, CODE_EXTS)) {
    findings.push(...scanTextForCodeIssues(file.content, file.relativePath));
  }

  return {
    tool: "code",
    ok: true,
    message:
      findings.length === 0
        ? "No high-signal risky patterns in the files I scanned."
        : `Found ${findings.length} risky pattern${findings.length === 1 ? "" : "s"}.`,
    findings,
  };
}

import type { AuditFinding, AuditResult } from "@drift-bot/types";
import { walkRepoFiles } from "../walk.js";

type SecretRule = {
  id: string;
  severity: AuditFinding["severity"];
  message: string;
  pattern: RegExp;
};

const RULES: SecretRule[] = [
  {
    id: "aws_access_key",
    severity: "P0",
    message: "Looks like an AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  {
    id: "private_key",
    severity: "P0",
    message: "Private key material in the tree",
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g,
  },
  {
    id: "github_token",
    severity: "P0",
    message: "Looks like a GitHub token",
    pattern: /ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/g,
  },
  {
    id: "slack_token",
    severity: "P0",
    message: "Looks like a Slack token",
    pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  },
  {
    id: "stripe_live",
    severity: "P0",
    message: "Looks like a live Stripe secret key",
    pattern: /sk_live_[A-Za-z0-9]{16,}/g,
  },
  {
    id: "telegram_bot_token",
    severity: "P0",
    message: "Looks like a Telegram bot token",
    pattern: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g,
  },
  {
    id: "generic_secret",
    severity: "P1",
    message: "Hardcoded secret-looking assignment",
    pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{12,}['"]/gi,
  },
];

export function scanTextForSecrets(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(content))) {
      const lineNumber = content.slice(0, match.index).split("\n").length;
      const line = content.split("\n")[lineNumber - 1] ?? "";
      if (isCommentLine(line)) {
        continue;
      }
      if (rule.id === "generic_secret" && isPlaceholderSecret(match[0], line)) {
        continue;
      }
      findings.push({
        severity: rule.severity,
        tool: "secrets",
        message: rule.message,
        file,
        line: lineNumber,
      });
      break;
    }
  }
  return findings;
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("<!--")
  );
}

function isPlaceholderSecret(match: string, line: string): boolean {
  const quoted = match.match(/['"]([^'"]{12,})['"]/);
  const value = quoted?.[1] ?? "";
  const haystack = `${value} ${line}`;
  if (/env\([A-Za-z0-9_]+\)/i.test(haystack)) {
    return true;
  }
  if (/process\.env|getenv\s*\(|os\.environ/.test(haystack)) {
    return true;
  }
  if (/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(value) && value.length < 80) {
    return true;
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return true;
  }
  if (/\.env(?:\.[A-Za-z0-9_-]+)?/.test(haystack)) {
    return true;
  }
  if (/(placeholder|changeme|your[-_]|example|dummy|todo|xxx+|redacted|insert[-_ ]key)/i.test(haystack)) {
    return true;
  }
  if (/^[A-Z][A-Z0-9_]{8,}$/.test(value)) {
    return true;
  }
  return false;
}

export async function runSecretsAudit(repoPath: string): Promise<AuditResult> {
  const findings: AuditFinding[] = [];
  for (const file of walkRepoFiles(repoPath)) {
    if (file.relativePath.endsWith(".example") || file.relativePath.includes(".env.example")) {
      continue;
    }
    findings.push(...scanTextForSecrets(file.content, file.relativePath));
  }

  return {
    tool: "secrets",
    ok: true,
    message:
      findings.length === 0
        ? "No obvious leaked secrets in the current tree."
        : `Found ${findings.length} possible leaked secret${findings.length === 1 ? "" : "s"}.`,
    findings,
  };
}

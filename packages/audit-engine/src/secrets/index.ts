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
    const match = rule.pattern.exec(content);
    if (!match) {
      continue;
    }
    const line = content.slice(0, match.index).split("\n").length;
    findings.push({
      severity: rule.severity,
      tool: "secrets",
      message: rule.message,
      file,
      line,
    });
  }
  return findings;
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

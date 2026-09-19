/**
 * GitHub code-check offering for Drift Bot users.
 * Source: docs/audit-checklist.md — pick from this list; `mvp` is what to ship first.
 *
 * Runtime shape: shallow-clone via GitHub App token, run the tool in a sandbox,
 * parse JSON, format a Telegram digest. Same worker shape as the daily check,
 * on-demand instead of cron.
 */
export type AuditCheck = {
  id: string;
  category: string;
  check: string;
  tools: readonly string[];
  command: string;
  foldedInto?: string;
  mvp: boolean;
  notes?: string;
};

export const AUDIT_CHECKS: readonly AuditCheck[] = [
  {
    id: "deps_cve",
    category: "Dependency & vulnerability scanning",
    check: "Known CVEs in dependencies",
    tools: ["GHSA", "OSV.dev", "Snyk", "npm audit", "pip-audit", "cargo-audit"],
    command: "/audit_deps",
    mvp: true,
    notes: "Already planned as part of the daily digest.",
  },
  {
    id: "deps_outdated",
    category: "Dependency & vulnerability scanning",
    check: "Outdated or unmaintained packages",
    tools: ["npm outdated", "Libraries.io"],
    command: "/audit_deps",
    mvp: true,
  },
  {
    id: "supply_chain",
    category: "Dependency & vulnerability scanning",
    check: "Transitive dependency risk",
    tools: ["npm ls", "Socket.dev"],
    command: "/audit_supply_chain",
    mvp: false,
  },
  {
    id: "sbom",
    category: "Dependency & vulnerability scanning",
    check: "Software Bill of Materials",
    tools: ["Syft", "CycloneDX"],
    command: "/sbom",
    mvp: false,
  },
  {
    id: "sast",
    category: "Static analysis / code quality (SAST)",
    check: "Security-focused static analysis",
    tools: ["Semgrep", "CodeQL", "Bandit"],
    command: "/audit_code",
    mvp: true,
  },
  {
    id: "lint",
    category: "Static analysis / code quality (SAST)",
    check: "Linting / style",
    tools: ["ESLint", "Ruff", "Clippy"],
    command: "/audit_code",
    foldedInto: "/audit_code",
    mvp: false,
    notes: "Lower-severity section in /audit_code.",
  },
  {
    id: "complexity",
    category: "Static analysis / code quality (SAST)",
    check: "Complexity / maintainability",
    tools: ["CodeClimate", "radon", "eslint-plugin-complexity"],
    command: "/audit_code",
    foldedInto: "/audit_code",
    mvp: false,
  },
  {
    id: "secrets_head",
    category: "Secrets & credential exposure",
    check: "Hardcoded secrets in current code",
    tools: ["Gitleaks", "TruffleHog"],
    command: "/audit_secrets",
    mvp: true,
    notes: "Cheap, high signal — ship first.",
  },
  {
    id: "secrets_history",
    category: "Secrets & credential exposure",
    check: "Secrets in git history (not just HEAD)",
    tools: ["TruffleHog --since-commit", "Gitleaks --log-opts"],
    command: "/audit_secrets",
    mvp: false,
    notes: "Deeper mode on the same command.",
  },
  {
    id: "licenses",
    category: "License compliance",
    check: "Dependency license conflicts",
    tools: ["license-checker", "pip-licenses", "FOSSA"],
    command: "/audit_licenses",
    mvp: false,
  },
  {
    id: "coverage",
    category: "Test coverage & CI health",
    check: "Coverage percentage",
    tools: ["Istanbul/nyc", "coverage.py", "tarpaulin"],
    command: "/audit_coverage",
    mvp: false,
    notes: "Reads latest CI artifact; does not run tests.",
  },
  {
    id: "ci_status",
    category: "Test coverage & CI health",
    check: "CI passing on default branch",
    tools: ["GitHub Actions API", "Checks API"],
    command: "/digest",
    foldedInto: "daily digest",
    mvp: true,
  },
  {
    id: "image_cve",
    category: "Container & infrastructure scanning",
    check: "Container image vulnerabilities",
    tools: ["Trivy", "Grype"],
    command: "/audit_image",
    mvp: false,
    notes: "Only if a Dockerfile is detected.",
  },
  {
    id: "iac",
    category: "Container & infrastructure scanning",
    check: "Infrastructure-as-code misconfig",
    tools: ["Checkov", "tfsec", "kube-score"],
    command: "/audit_iac",
    mvp: false,
  },
  {
    id: "dockerfile",
    category: "Container & infrastructure scanning",
    check: "Dockerfile best practices",
    tools: ["Hadolint"],
    command: "/audit_image",
    foldedInto: "/audit_image",
    mvp: false,
  },
  {
    id: "client_secrets",
    category: "API & runtime security",
    check: "Exposed secrets/keys in client-side bundles",
    tools: ["secretlint", "grep on built assets"],
    command: "/audit_secrets",
    foldedInto: "/audit_secrets",
    mvp: false,
  },
  {
    id: "headers",
    category: "API & runtime security",
    check: "Missing security headers (CSP, HSTS, etc.)",
    tools: ["securityheaders.com", "helmet config check"],
    command: "/audit_headers",
    mvp: false,
    notes: "Only if the repo deploys a public web service; takes a URL.",
  },
  {
    id: "cors_auth",
    category: "API & runtime security",
    check: "Open CORS / auth misconfig",
    tools: ["LLM review of route definitions"],
    command: "/audit_code",
    foldedInto: "/audit_code",
    mvp: false,
  },
  {
    id: "contracts",
    category: "Smart contracts",
    check: "Static analysis for common Solidity vulns",
    tools: ["Slither"],
    command: "/audit_contracts",
    mvp: true,
    notes: "If the repo has .sol files — differentiator for Web3 users.",
  },
  {
    id: "contracts_deep",
    category: "Smart contracts",
    check: "Symbolic execution / deeper fuzzing",
    tools: ["Mythril", "Echidna"],
    command: "/audit_contracts_deep",
    mvp: false,
    notes: "Premium — slow.",
  },
  {
    id: "gas",
    category: "Smart contracts",
    check: "Gas optimization",
    tools: ["Slither gas module", "solidity-coverage"],
    command: "/audit_contracts",
    foldedInto: "/audit_contracts",
    mvp: false,
  },
  {
    id: "exploit_patterns",
    category: "Smart contracts",
    check: "Known exploit pattern matching",
    tools: ["DeFiHackLabs corpus", "LLM cross-check"],
    command: "/audit_contracts",
    foldedInto: "/audit_contracts",
    mvp: false,
  },
  {
    id: "llm_review",
    category: "LLM-assisted review",
    check: "Business logic, auth flows, prompt-injection risk — not cleanly automatable",
    tools: ["Claude API + structured checklist"],
    command: "/audit_review",
    mvp: false,
    notes: "Premium. Same slot as Break before launch (/audit): 30+ issues, P0/P1/P2, fix every P0.",
  },
] as const;

/** Ship these commands first, in this order. */
export const AUDIT_MVP_ROLLOUT = [
  "/audit_secrets",
  "/audit_deps",
  "/audit_code",
  "/audit_contracts",
] as const;

export function mvpAuditChecks(): AuditCheck[] {
  return AUDIT_CHECKS.filter((check) => check.mvp && !check.foldedInto);
}

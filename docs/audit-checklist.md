# Pre-production audit checklist for Drift Bot

What we offer people who connect a GitHub repo: checks worth running before
the code ships. Organized by category, with tools per stack and a bot command
for each. Treat this as the source list to pick from — not every category is
a command on day one; the MVP column is what to ship first.

Machine-readable catalog: `api/src/audit-checks.ts`.

## 1. Dependency & vulnerability scanning

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Known CVEs in dependencies | GitHub Advisory Database (GHSA), OSV.dev, Snyk, npm audit / pip-audit / cargo-audit | `/audit_deps <repo>` | yes — already in the daily check |
| Outdated/unmaintained packages | npm outdated, Libraries.io API | folded into `/audit_deps` | yes |
| Transitive dependency risk | `npm ls`, Socket.dev (flags suspicious package behavior — install scripts, obfuscation) | `/audit_supply_chain <repo>` | no |
| Software Bill of Materials (SBOM) | Syft, CycloneDX | `/sbom <repo>` | no |

## 2. Static analysis / code quality (SAST)

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Security-focused static analysis | Semgrep (multi-language, easiest to run headless), CodeQL (GitHub-native, deeper but heavier), Bandit (Python-specific) | `/audit_code <repo>` | yes |
| Linting / style | ESLint, Ruff, Clippy — per-stack | folded into `/audit_code` output as a lower-severity section | no |
| Complexity / maintainability | CodeClimate, `radon` (Python), `eslint-plugin-complexity` | no separate command — surface in `/audit_code` summary | no |

## 3. Secrets & credential exposure

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Hardcoded secrets in current code | Gitleaks, TruffleHog | `/audit_secrets <repo>` | yes — cheap, high signal, and embarrassing to ship without |
| Secrets in git history (not just HEAD) | TruffleHog (`--since-commit`), Gitleaks (`--log-opts`) | same command, deeper mode flag | no |

## 4. License compliance

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Dependency license conflicts (e.g. GPL in a closed-source product) | `license-checker` (npm), `pip-licenses`, FOSSA | `/audit_licenses <repo>` | no |

## 5. Test coverage & CI health

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Coverage percentage | Istanbul/nyc, coverage.py, tarpaulin | `/audit_coverage <repo>` (reads latest CI artifact, doesn't run tests itself) | no |
| CI pipeline passing on default branch | GitHub Actions API / Checks API | fold into daily digest as a status line | yes |

## 6. Container & infrastructure scanning

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Container image vulnerabilities | Trivy, Grype | `/audit_image <repo>` (if a Dockerfile is detected) | no |
| Infrastructure-as-code misconfig | Checkov, tfsec (Terraform), kube-score (k8s manifests) | `/audit_iac <repo>` | no |
| Dockerfile best practices | Hadolint | fold into `/audit_image` | no |

## 7. API & runtime security

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Exposed secrets/keys in client-side bundles | `secretlint`, manual grep patterns on built assets | fold into `/audit_secrets` | no |
| Missing security headers (CSP, HSTS, etc.) plus accidental public `.env` / `.git` | fetch the repo's own homepage | `/audit_surface` (also on the daily digest). Door check only, not a live bot-attack feed | yes |
| Open CORS / auth misconfig | manual checklist item, not easily automatable — flag as a prompt-based LLM review of route definitions | fold into `/audit_code` deep-dive | no |

## 8. Smart contract specific (relevant given the Web3 stack)

| Check | Tools | Command idea | MVP |
|---|---|---|---|
| Static analysis for common Solidity vulns (reentrancy, overflow, access control) | Slither | `/audit_contracts <repo>` | yes, if repo has `.sol` files — differentiator |
| Symbolic execution / deeper fuzzing | Mythril, Echidna | `/audit_contracts_deep <repo>` (gate to premium — slow) | no |
| Gas optimization | Slither's gas module, `solidity-coverage` | fold into `/audit_contracts` output | no |
| Known exploit pattern matching against audited-project database | DeFiHackLabs corpus, manual reference | fold into `/audit_contracts` as an LLM cross-check | no |

## 9. Cross-cutting: LLM-assisted review

For anything not cleanly automatable (business logic bugs, auth flow correctness,
prompt injection risk in AI-integrated code), `/audit_review <repo> <path>`
(also `/audit` — **Break before launch**) feeds the relevant files plus a
structured review checklist to the LLM: find at least 30 problems across UX,
product logic, security, performance, and mobile; rank P0 / P1 / P2; fix every
P0. Premium-tier deep research.

## Suggested rollout order

1. `/audit_secrets` — cheapest, highest signal, easy win
2. `/audit_deps` — same infrastructure as the daily digest
3. `/audit_code` (Semgrep) — broad security coverage, single tool
4. `/audit_contracts` (Slither) — differentiator when `.sol` files exist
5. Everything else, gated to paid/premium, added as demand shows up

Most of these tools (Semgrep, Gitleaks, Trivy, Slither) run as CLI calls
inside a sandboxed job — same shape as the daily-check worker, triggered
on-demand. Clone the repo (shallow) with the GitHub App installation token,
run the tool, parse JSON, format a digest.

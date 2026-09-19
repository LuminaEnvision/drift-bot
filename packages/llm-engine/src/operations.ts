/**
 * Planned on-demand repo operations (deep research). Not wired to Telegram yet.
 * `/research <repo>` will open this menu plus the GitHub audit offering in
 * `packages/audit-engine/src/catalog.ts` / `docs/audit-checklist.md`.
 */
export type ResearchOperation = {
  id: string;
  command: string;
  title: string;
  summary: string;
  prompt: string;
  outcome: string;
};

export const RESEARCH_OPERATIONS: readonly ResearchOperation[] = [
  {
    id: "changelog",
    command: "/changelog",
    title: "Changelog",
    summary: "Synthesize recent changelog and release notes for one dependency.",
    prompt:
      "Synthesize recent changelog and release notes for the given package in this repo, and flag anything that would affect this stack.",
    outcome: "A short, repo-specific digest of what actually changed.",
  },
  {
    id: "migrate",
    command: "/migrate",
    title: "Migrate",
    summary: "Migration guidance for a version bump.",
    prompt:
      "Give migration guidance for bumping the given package to the target version in this repo, including breaking changes and a safe order of work.",
    outcome: "A concrete upgrade path, not a generic changelog dump.",
  },
  {
    id: "compat",
    command: "/compat",
    title: "Compat",
    summary: "Full dependency-tree compatibility pass.",
    prompt:
      "Run a full dependency-tree compatibility pass on this repo and flag conflicting version constraints.",
    outcome: "Conflicts and pin mismatches before they break install or CI.",
  },
  {
    id: "security",
    command: "/security",
    title: "Security",
    summary: "Deep pass on CVEs that affect how this repo actually uses the tree.",
    prompt:
      "Deep-pass open CVEs against this repo's real usage, not merely presence in the lockfile.",
    outcome: "Actionable vulns, not a noisy advisory dump.",
  },
  {
    id: "break_before_launch",
    command: "/audit",
    title: "Break before launch",
    summary:
      "Umbrella GitHub audit: MVP tool checks (secrets, deps, Semgrep, Slither) plus LLM review — 30+ issues, P0/P1/P2, fix every P0.",
    prompt:
      "Audit this MVP as a Senior Full-Stack Developer and Product Designer. Find at least 30 problems across UX, product logic, security, performance, and the mobile experience. Rank them P0 / P1 / P2 and fix every P0.",
    outcome: "Critical bugs show up here before the first 100 users find them.",
  },
  {
    id: "ask",
    command: "/ask",
    title: "Ask",
    summary: "Open-ended question about the repo's stack.",
    prompt:
      "Answer the user's question about this repo's stack using web search plus repo context.",
    outcome: "A grounded answer, not a generic stack lecture.",
  },
] as const;

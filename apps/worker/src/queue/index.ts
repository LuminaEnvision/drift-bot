export function createQueues() {
  return {
    dailyCheck: "daily-check",
    deepResearch: "deep-research",
    auditRun: "audit-run",
  } as const;
}

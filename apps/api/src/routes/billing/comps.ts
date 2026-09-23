/** Usernames that get Premium with no expiry. No @. Extra names: COMP_PREMIUM_USERNAMES. */
const BUILTIN_COMPS = ["martaralj"];

export function isCompPremium(username: string | null | undefined): boolean {
  const name = normalizeUsername(username);
  if (!name) {
    return false;
  }
  return compUsernames().has(name);
}

export function lifetimePremiumWrite() {
  return { tier: "premium" as const, tierExpiresAt: null };
}

function compUsernames(): Set<string> {
  const extra = (process.env.COMP_PREMIUM_USERNAMES ?? "")
    .split(",")
    .map((value) => normalizeUsername(value))
    .filter((value): value is string => Boolean(value));
  return new Set([...BUILTIN_COMPS, ...extra]);
}

function normalizeUsername(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const name = value.trim().replace(/^@/, "").toLowerCase();
  return name.length > 0 ? name : null;
}

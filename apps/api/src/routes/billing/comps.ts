/** Usernames that get Premium with no expiry. No @. Extra names: COMP_PREMIUM_USERNAMES. Extra ids: COMP_PREMIUM_USER_IDS. */
const BUILTIN_COMPS = ["martaralj"];

export function isCompPremium(
  username: string | null | undefined,
  telegramUserId?: bigint | number | null,
): boolean {
  const name = normalizeUsername(username);
  if (name && compUsernames().has(name)) {
    return true;
  }
  if (telegramUserId != null && compUserIds().has(String(telegramUserId))) {
    return true;
  }
  return false;
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

function compUserIds(): Set<string> {
  return new Set(
    (process.env.COMP_PREMIUM_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function normalizeUsername(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const name = value.trim().replace(/^@/, "").toLowerCase();
  return name.length > 0 ? name : null;
}

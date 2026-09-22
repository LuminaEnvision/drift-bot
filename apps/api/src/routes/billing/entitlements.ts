import type { AccessSource, PaidPlan, Plan } from "@drift-bot/types";

export const SUBSCRIPTION_PERIOD_SECONDS = 2_592_000;
export const TRIAL_PLAN = "paid" as const;

export type { AccessSource, PaidPlan, Plan };

export type Limits = {
  repos: number | null;
  digest: "weekly" | "daily";
  deepResearchPerMonth: number | null;
};

export const TIER_LIMITS: Record<Plan, Limits> = {
  free: { repos: 1, digest: "weekly", deepResearchPerMonth: 0 },
  paid: { repos: 5, digest: "daily", deepResearchPerMonth: 5 },
  premium: { repos: null, digest: "daily", deepResearchPerMonth: null },
};

export const PLAN_COPY: Record<PaidPlan, { title: string; description: string }> = {
  paid: {
    title: "Paid",
    description: "5 repos, daily digests, 5 deep research runs. Bills every 30 days in Stars.",
  },
  premium: {
    title: "Premium",
    description: "Unlimited repos, daily priority digests, unlimited deep research. Bills every 30 days in Stars.",
  },
};

export type BillingUser = {
  tier: string;
  tierExpiresAt: Date | null;
  trialEndsAt: Date | null;
};

export function trialDays(): number {
  const days = Number(process.env.TRIAL_DAYS ?? 30);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

export function planStars(plan: PaidPlan): number {
  const fallback = plan === "paid" ? 150 : 500;
  const raw = Number(
    plan === "paid" ? process.env.PAID_STARS_MONTHLY : process.env.PREMIUM_STARS_MONTHLY,
  );
  if (!Number.isInteger(raw) || raw < 1 || raw > 10_000) {
    return fallback;
  }
  return raw;
}

export function isPaidPlan(value: string): value is PaidPlan {
  return value === "paid" || value === "premium";
}

export function resolveAccess(
  user: BillingUser,
  now = new Date(),
): { tier: Plan; source: AccessSource } {
  if (isPaidPlan(user.tier) && (user.tierExpiresAt == null || user.tierExpiresAt > now)) {
    return { tier: user.tier, source: "subscription" };
  }

  if (user.trialEndsAt && user.trialEndsAt > now) {
    return { tier: TRIAL_PLAN, source: "trial" as const };
  }

  return { tier: "free" as const, source: "free" as const };
}

export function daysLeft(until: Date | null, now = new Date()): number | null {
  if (!until) {
    return null;
  }
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) {
    return 0;
  }
  return Math.ceil(ms / 86_400_000);
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

export type BillingSnapshot = import("@drift-bot/types").BillingSnapshot;

export function toBillingSnapshot(user: BillingUser, now = new Date()): BillingSnapshot {
  const access = resolveAccess(user, now);
  return {
    tier: access.tier,
    source: access.source,
    trial_ends_at: user.trialEndsAt?.toISOString() ?? null,
    trial_days_left: daysLeft(user.trialEndsAt, now),
    subscription_expires_at:
      access.source === "subscription" ? (user.tierExpiresAt?.toISOString() ?? null) : null,
    limits: TIER_LIMITS[access.tier],
    plans: [
      {
        id: "paid",
        title: PLAN_COPY.paid.title,
        stars: planStars("paid"),
        period_days: 30,
        limits: TIER_LIMITS.paid,
      },
      {
        id: "premium",
        title: PLAN_COPY.premium.title,
        stars: planStars("premium"),
        period_days: 30,
        limits: TIER_LIMITS.premium,
      },
    ],
  };
}

export function canConnectRepo(activeCount: number, repoLimit: number | null): string | null {
  if (repoLimit == null) {
    return null;
  }
  if (activeCount >= repoLimit) {
    return `You're at your repo limit (${repoLimit}). /disconnect one or /upgrade.`;
  }
  return null;
}

export function canCheckout(access: ReturnType<typeof resolveAccess>, plan: PaidPlan): string | null {
  if (access.source === "subscription" && access.tier === plan) {
    return `You're already on ${plan === "paid" ? "Paid" : "Premium"}.`;
  }
  if (access.source === "subscription" && access.tier === "premium" && plan === "paid") {
    return "You're already on Premium.";
  }
  return null;
}

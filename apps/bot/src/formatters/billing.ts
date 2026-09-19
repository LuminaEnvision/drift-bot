import type { BillingSnapshot } from "@drift-bot/types";

export function formatLimits(limits: BillingSnapshot["limits"]): string {
  const repos = limits.repos == null ? "unlimited repos" : `${limits.repos} repo${limits.repos === 1 ? "" : "s"}`;
  const research =
    limits.deepResearchPerMonth == null
      ? "unlimited deep research"
      : limits.deepResearchPerMonth === 0
        ? "no deep research"
        : `${limits.deepResearchPerMonth} deep research runs / month`;
  return `${repos}, ${limits.digest} digest, ${research}`;
}

export function formatBilling(billing: BillingSnapshot): string {
  if (billing.source === "trial") {
    const days = billing.trial_days_left ?? 0;
    return `You're on a Paid trial — ${days} day${days === 1 ? "" : "s"} left.\n${formatLimits(billing.limits)}`;
  }
  if (billing.source === "subscription") {
    const until = billing.subscription_expires_at
      ? ` Renews/expires ${new Date(billing.subscription_expires_at).toUTCString()}.`
      : "";
    return `Plan: ${billing.tier}.${until}\n${formatLimits(billing.limits)}`;
  }
  return `Plan: Free.\n${formatLimits(billing.limits)}\nSubscribe to keep daily checks after your trial.`;
}

export function welcomeText(billing: BillingSnapshot): string {
  return `Welcome to Drift Bot.

I watch your GitHub repos for dependency drift, security advisories, and framework-relevant changes — then send you a digest on Telegram.

${formatBilling(billing)}

Pay later with Telegram Stars (Telegram Wallet can cover the Stars). Trial first, no card required.

/tier — your plan
/upgrade — subscribe
/help — commands`;
}

export const HELP = `Drift Bot commands:

/start — welcome and start a 30-day Paid trial
/tier — current plan, trial, and usage window
/upgrade — subscribe with Telegram Stars
/help — this list

Repo connection, daily checks, and GitHub audits (secrets, deps, code, contracts) ship next.`;

import type { BillingSnapshot } from "@drift-bot/types";

function planName(tier: string): string {
  if (tier === "paid") {
    return "Paid";
  }
  if (tier === "premium") {
    return "Premium";
  }
  return "Free";
}

export function formatLimits(limits: BillingSnapshot["limits"]): string {
  const repos = limits.repos == null ? "unlimited repos" : `${limits.repos} repo${limits.repos === 1 ? "" : "s"}`;
  return `${repos}, ${limits.digest} digest`;
}

export function accountLine(telegramUserId: number, username?: string): string {
  const handle = username ? `@${username}` : "no @username set";
  return `Your Telegram id is ${telegramUserId}. Username: ${handle}`;
}

export function formatBilling(
  billing: BillingSnapshot,
  identity?: { id: number; username?: string },
): string {
  const account = identity ? `\n${accountLine(identity.id, identity.username)}` : "";
  if (billing.source === "trial") {
    const days = billing.trial_days_left ?? 0;
    return `You're on a paid trial. ${days} day${days === 1 ? "" : "s"} left.\n${formatLimits(billing.limits)}${account}`;
  }
  if (billing.source === "subscription") {
    const until = billing.subscription_expires_at
      ? ` Renews ${new Date(billing.subscription_expires_at).toUTCString()}.`
      : " Complimentary. No expiry.";
    return `You're on ${planName(billing.tier)}.${until}\n${formatLimits(billing.limits)}${account}`;
  }
  return `You're on Free.\n${formatLimits(billing.limits)}\nSubscribe if you want the daily checks back.${account}`;
}

export function welcomeText(
  billing: BillingSnapshot,
  identity?: { id: number; username?: string },
): string {
  const paid = billing.plans.find((plan) => plan.id === "paid")?.stars ?? 150;
  const premium = billing.plans.find((plan) => plan.id === "premium")?.stars ?? 500;
  return `Hey. I'm Drift Bot.

I watch the public GitHub repos you connect. I check CVEs, CI, and the public site door, and I message you here when something changes.

${formatBilling(billing, identity)}

Free: 1 public repo, weekly digest, all audits.
Paid (${paid} Stars / 30 days): 5 public repos, daily digest, all audits.
Premium (${premium} Stars / 30 days): unlimited public repos, daily digest first in line, all audits.

Payment with Telegram Stars via Telegram Wallet. /start is a 30-day Paid trial.

/connect owner/repo  watch a public GitHub repo
/tier  your plan
/upgrade  subscribe
/help  what I can do`;
}

export const HELP = `Here's what I can do right now:

/start  say hi and start your 30-day trial
/connect owner/repo  watch a public GitHub repo
/repos  what I'm watching
/disconnect owner/repo  stop watching
/digest  cheap CVE + CI check now
/audit_secrets  leaked keys
/audit_deps  known CVEs
/audit_code  risky patterns
/audit_contracts  Solidity footguns
/audit_surface  public site door check (headers, accidental .env / .git)
/audit  all of it, break before launch. This one sends a PDF and a .md you can paste into Cursor.
I also run the cheap digest on my own. Daily on Paid and Premium, weekly on Free. Type /digest if it is not in the menu yet.
/tier  see your plan
/upgrade  subscribe with Stars
/help  this list

Public repos only for now. Private repos wait on the GitHub App.
Deep research (/ask, /changelog, /migrate, /compat) is not live yet.`;

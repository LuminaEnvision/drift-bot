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
  const research =
    limits.deepResearchPerMonth == null
      ? "unlimited deep research"
      : limits.deepResearchPerMonth === 0
        ? "no deep research"
        : `${limits.deepResearchPerMonth} deep research runs a month`;
  return `${repos}, ${limits.digest} digest, ${research}`;
}

export function formatBilling(billing: BillingSnapshot): string {
  if (billing.source === "trial") {
    const days = billing.trial_days_left ?? 0;
    return `You're on a paid trial. ${days} day${days === 1 ? "" : "s"} left.\n${formatLimits(billing.limits)}`;
  }
  if (billing.source === "subscription") {
    const until = billing.subscription_expires_at
      ? ` Renews ${new Date(billing.subscription_expires_at).toUTCString()}.`
      : "";
    return `You're on ${planName(billing.tier)}.${until}\n${formatLimits(billing.limits)}`;
  }
  return `You're on Free.\n${formatLimits(billing.limits)}\nSubscribe if you want the daily checks back.`;
}

export function welcomeText(billing: BillingSnapshot): string {
  return `Hey. I'm Drift Bot.

I watch the GitHub repos you connect. Cheap CVE and CI check on a schedule. Paid and the trial get that every day. Free gets it once a week. I message you here when something changes.

${formatBilling(billing)}

Trial's free, no card. After that you can subscribe with Stars. Telegram Wallet works.

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

Public repos only for now. Private repos wait on the GitHub App.`;

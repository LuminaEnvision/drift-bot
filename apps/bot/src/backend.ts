import type { AuditKind, AuditReport, BillingSnapshot, ConnectedRepo, Invoice, PaidPlan } from "@drift-bot/types";

export type { AuditKind, AuditReport, BillingSnapshot, ConnectedRepo, Invoice, PaidPlan };

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export function apiBaseUrl(): string {
  return API_BASE_URL;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body}`);
    this.name = "ApiError";
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!INTERNAL_API_SECRET) {
    throw new Error("INTERNAL_API_SECRET is required");
  }

  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${INTERNAL_API_SECRET}`,
        ...init?.headers,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network error";
    throw new Error(`Couldn't reach the API at ${API_BASE_URL} (${reason}). Check API_BASE_URL on the bot service.`);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, text);
  }
  return text.length > 0 ? (JSON.parse(text) as T) : ({} as T);
}

export function upsertUser(telegramUserId: number, telegramUsername?: string) {
  return api<{ billing: BillingSnapshot }>("/v1/users/telegram", {
    method: "POST",
    body: JSON.stringify({
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
    }),
  });
}

export function getBilling(telegramUserId: number) {
  return api<{ billing: BillingSnapshot }>(`/v1/users/${telegramUserId}/billing`);
}

export function createStarsCheckout(telegramUserId: number, plan: PaidPlan) {
  return api<{ invoice: Invoice }>("/v1/payments/stars/checkout", {
    method: "POST",
    body: JSON.stringify({ telegram_user_id: telegramUserId, plan }),
  });
}

export function preCheckoutStars(input: {
  telegram_user_id: number;
  payload: string;
  currency: string;
  total_amount: number;
}) {
  return api<{ ok: boolean; error?: string }>("/v1/payments/stars/pre-checkout", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function completeStarsPayment(input: {
  telegram_user_id: number;
  payload: string;
  currency: string;
  total_amount: number;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
  is_recurring?: boolean;
  is_first_recurring?: boolean;
  subscription_expiration_date?: number;
}) {
  return api<{ billing: BillingSnapshot }>("/v1/payments/stars/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listRepos(telegramUserId: number) {
  return api<{ repos: ConnectedRepo[] }>(`/v1/users/${telegramUserId}/repos`);
}

export function connectRepo(telegramUserId: number, repo: string) {
  return api<{ repo: ConnectedRepo }>("/v1/repos/connect", {
    method: "POST",
    body: JSON.stringify({ telegram_user_id: telegramUserId, repo }),
  });
}

export function disconnectRepo(telegramUserId: number, repo: string) {
  return api<{ ok: boolean; repo: ConnectedRepo }>("/v1/repos/disconnect", {
    method: "POST",
    body: JSON.stringify({ telegram_user_id: telegramUserId, repo }),
  });
}

export function runRepoAudit(telegramUserId: number, kind: AuditKind, repo?: string) {
  return api<{ report: AuditReport }>("/v1/repos/audit", {
    method: "POST",
    body: JSON.stringify({ telegram_user_id: telegramUserId, kind, repo }),
  });
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "The bot and API secrets do not match. INTERNAL_API_SECRET must be the same on both Railway services.";
    }
    try {
      const parsed = JSON.parse(error.body) as { error?: string };
      if (parsed.error) {
        return parsed.error;
      }
    } catch {
      // use fallback
    }
  }
  if (error instanceof Error && error.message.startsWith("Couldn't reach the API")) {
    return error.message;
  }
  return fallback;
}

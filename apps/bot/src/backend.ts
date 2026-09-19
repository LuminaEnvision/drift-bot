import type { BillingSnapshot, Invoice, PaidPlan } from "@drift-bot/types";

export type { BillingSnapshot, Invoice, PaidPlan };

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${INTERNAL_API_SECRET}`,
      ...init?.headers,
    },
  });

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

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.body) as { error?: string };
      if (parsed.error) {
        return parsed.error;
      }
    } catch {
      // use fallback
    }
  }
  return fallback;
}

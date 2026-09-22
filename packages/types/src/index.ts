export type Plan = "free" | "paid" | "premium";
export type PaidPlan = Exclude<Plan, "free">;
export type AccessSource = "trial" | "subscription" | "free";

export type Limits = {
  repos: number | null;
  digest: "weekly" | "daily";
  deepResearchPerMonth: number | null;
};

export type BillingSnapshot = {
  tier: Plan;
  source: AccessSource;
  trial_ends_at: string | null;
  trial_days_left: number | null;
  subscription_expires_at: string | null;
  limits: Limits;
  plans: Array<{
    id: PaidPlan;
    title: string;
    stars: number;
    period_days: 30;
    limits: Limits;
  }>;
};

export type Invoice = {
  title: string;
  description: string;
  payload: string;
  currency: "XTR";
  prices: Array<{ label: string; amount: number }>;
  subscription_period: number;
};

export type StackKind = "evm" | "solana" | "node" | "python" | "rust";

export type Stack = {
  kind: StackKind;
  evidence: string[];
};

export type AuditFinding = {
  severity: "P0" | "P1" | "P2" | "info";
  tool: string;
  message: string;
  file?: string;
  line?: number;
};

export type AuditResult = {
  tool: string;
  ok: boolean;
  unsupported?: boolean;
  message?: string;
  findings: AuditFinding[];
};

export type AuditKind = "secrets" | "deps" | "code" | "contracts" | "full";

export type ConnectedRepo = {
  id: string;
  full_name: string;
  default_branch: string;
  source: "public" | "github_app";
  stacks: StackKind[];
  is_active: boolean;
};

export type AuditReport = {
  repo: string;
  kind: AuditKind;
  results: AuditResult[];
  findings: AuditFinding[];
};

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

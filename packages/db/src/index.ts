import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export { PrismaClient } from "@prisma/client";
export type {
  User,
  Repo,
  GithubInstallation,
  DailyRun,
  ResearchRun,
  UsageCounter,
  CheckoutSession,
  Payment,
} from "@prisma/client";

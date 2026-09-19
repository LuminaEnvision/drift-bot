import type { FastifyInstance } from "fastify";
import { registerStarsBillingRoutes } from "./billing/stars.js";
import { registerGithubOauthRoutes } from "./github/oauth.js";
import { registerGithubWebhookRoutes } from "./github/webhooks.js";
import { registerUserRoutes } from "./users/telegram.js";

export async function registerV1Routes(app: FastifyInstance) {
  await registerUserRoutes(app);
  await registerStarsBillingRoutes(app);
  await registerGithubOauthRoutes(app);
  await registerGithubWebhookRoutes(app);
}

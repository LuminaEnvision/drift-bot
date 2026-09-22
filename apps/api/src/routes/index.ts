import type { FastifyInstance } from "fastify";
import { registerStarsBillingRoutes } from "./billing/stars.js";
import { registerGithubOauthRoutes } from "./github/oauth.js";
import { registerGithubWebhookRoutes } from "./github/webhooks.js";
import { registerDigestRoutes } from "./digest.js";
import { registerRepoRoutes } from "./repos.js";
import { registerUserRoutes } from "./users/telegram.js";

export async function registerV1Routes(app: FastifyInstance) {
  await registerUserRoutes(app);
  await registerStarsBillingRoutes(app);
  await registerRepoRoutes(app);
  await registerDigestRoutes(app);
  await registerGithubOauthRoutes(app);
  await registerGithubWebhookRoutes(app);
}

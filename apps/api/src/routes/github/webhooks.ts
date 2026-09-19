import type { FastifyInstance } from "fastify";

/** GitHub push/release webhooks — not wired. */
export async function registerGithubWebhookRoutes(app: FastifyInstance) {
  app.post("/github/webhooks", async (_request, reply) => {
    return reply.code(501).send({ error: "GitHub webhooks are not wired yet" });
  });
}

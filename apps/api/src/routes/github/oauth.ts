import type { FastifyInstance } from "fastify";

/** GitHub App OAuth callback — not wired. */
export async function registerGithubOauthRoutes(app: FastifyInstance) {
  app.get("/github/oauth/callback", async (_request, reply) => {
    return reply.code(501).send({ error: "GitHub OAuth is not wired yet" });
  });
}

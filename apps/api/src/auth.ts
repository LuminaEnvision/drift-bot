import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireInternalAuth(request: FastifyRequest, reply: FastifyReply) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    request.log.error("INTERNAL_API_SECRET is not set");
    return reply.code(500).send({ error: "server_misconfigured" });
  }

  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token !== expected) {
    return reply.code(401).send({ error: "unauthorized" });
  }
}

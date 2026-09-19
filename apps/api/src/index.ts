import Fastify from "fastify";
import { prisma } from "@drift-bot/db";
import { requireInternalAuth } from "./auth.js";
import { HttpError } from "./http.js";
import { registerV1Routes } from "./routes/index.js";

const app = Fastify({ logger: true });

app.get("/health", async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    app.log.error(error, "health check failed");
    return reply.code(503).send({ status: "error" });
  }
});

app.register(
  async (v1) => {
    v1.addHook("preHandler", requireInternalAuth);
    await registerV1Routes(v1);
  },
  { prefix: "/v1" },
);

app.setErrorHandler((error, request, reply) => {
  if (error instanceof HttpError) {
    return reply.code(error.status).send({ error: error.message });
  }
  request.log.error(error);
  return reply.code(500).send({ error: "internal_error" });
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });

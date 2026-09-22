FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["pnpm", "start:api"]

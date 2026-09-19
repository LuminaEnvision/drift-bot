# Drift Bot

Telegram bot that monitors GitHub repos for dependency drift, security advisories, and framework-relevant changes, plus on-demand GitHub audits (secrets, deps, Semgrep, Slither, **Break before launch**) and deep research. Free / paid / premium tiers gate repo count, digest frequency, and deep research.

This repo is the skeleton plus billing: a `/start` trial, Telegram Stars checkout, a health check, and a Postgres schema. GitHub App, scheduler, and research are not wired yet.

## Stack

- **Bot:** Node.js, TypeScript, [grammY](https://grammy.dev)
- **API:** [Fastify](https://fastify.dev)
- **DB:** Postgres 16 via Docker, [Prisma](https://www.prisma.io) for migrations and a typed client

Prisma vs `pg`: Prisma stays in `packages/db` (this reorg did **not** switch to Drizzle — that would be a schema/client rewrite). The API is the only process that talks to the database. The bot stays stateless and calls the API with `INTERNAL_API_SECRET`.

pnpm workspaces + Turborepo orchestrate `apps/*` and `packages/*`.

## Billing

New users get **30 days of Paid** on first `/start` (5 repos, daily digest, 5 deep research runs / month). When the trial ends they drop to Free unless they subscribe.

Checkout is **Telegram Stars**, not a separate crypto flow. Stars is the native in-chat invoice; Telegram Wallet can hold or buy Stars and pay the invoice. Recurring period is 30 days (the only period Telegram allows). TON Connect / raw Telegram Wallet crypto can wait.

| | Free | Paid (trial + 150 ⭐ / 30 days) | Premium (500 ⭐ / 30 days) |
|---|---|---|---|
| Repos | 1 | 5 | unlimited |
| Digest | weekly | daily | daily, priority |
| Deep research | — | 5 / month | unlimited (soft limit) |

Prices are `PAID_STARS_MONTHLY` and `PREMIUM_STARS_MONTHLY` in `.env`.

## Local loop

Full copy-paste playbook: [docs/local-loop.md](docs/local-loop.md)

```bash
cd "/Users/luminaenvision/Drift Bot"
cp .env.example .env          # skip if .env already exists
# paste TELEGRAM_BOT_TOKEN from @BotFather into .env
pnpm install
pnpm db:up
pnpm migrate
```

Then two terminals:

```bash
pnpm dev:api               # curl http://localhost:3000/health → {"status":"ok"}
pnpm dev:bot               # Telegram /start → 30-day Paid trial
```

Docker Desktop must be running. Leave `GITHUB_APP_*` and `ANTHROPIC_API_KEY` empty until the GitHub App step.

If `/newbot` is blocked on your Telegram account, send [docs/partner-botfather.md](docs/partner-botfather.md) to a partner. They create the bot; you paste the token into `.env`.

## Layout

| Path | Role |
|---|---|
| `apps/bot` | grammY: `/start`, `/help`, `/tier`, `/upgrade` |
| `apps/api` | Fastify: health, users, Stars billing |
| `apps/worker` | Queue/job stubs (not wired) |
| `packages/db` | Prisma schema + migrations |
| `packages/types` | Shared TS types |
| `packages/audit-engine` | Check catalog + scanner wrappers (stubs) |
| `packages/stack-detector` | Manifest fingerprinting |
| `packages/llm-engine` | Deep-research catalog |
| `infra/docker` | Local Postgres Compose file |

## What's next

1. GitHub App install/OAuth and `/connect` + `/repos`
2. Stack fingerprint on connect
3. Daily minimum check (scheduler + registry/CVE sources)
4. Enforce repo / research limits using `resolveAccess`
5. GitHub audits — `docs/audit-checklist.md` (MVP: `/audit_secrets`, `/audit_deps`, `/audit_code`, `/audit_contracts`, then `/audit` **Break before launch**)

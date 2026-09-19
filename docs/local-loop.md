# Local loop

Get Drift Bot answering `/start` on your phone and `GET /health` returning `{ "status": "ok" }`. Do not set GitHub or Anthropic keys yet.

Work from the repo root: `/Users/luminaenvision/Drift Bot`

## 1. Prerequisites

- **Node.js 22+** — this machine already has `v22.22.0`
- **pnpm** — `corepack enable` then `corepack prepare pnpm@9.15.4 --activate` if `pnpm` is missing
- **Docker Desktop** — required for Postgres. Install from https://www.docker.com/products/docker-desktop/ then open the app once so the daemon is running.

Check:

```bash
pnpm -v
docker compose version
```

If `docker` is `command not found`, Docker Desktop is not installed or not on your PATH. Quit and reopen the terminal after installing.

## 2. Telegram bot token

1. Open Telegram and talk to [@BotFather](https://t.me/BotFather)
2. `/newbot` (or `/mybots` if Drift Bot already exists)
3. Display name: **Drift Bot**
4. Copy the token (`123456789:AA...`)

## 3. Environment file

`.env` already exists at the repo root. Open it and set **only** these for the local loop:

| Variable | Local value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | paste the BotFather token, no quotes |
| `DATABASE_URL` | `postgresql://drift:drift@localhost:5432/driftbot` |
| `API_BASE_URL` | `http://localhost:3000` |
| `INTERNAL_API_SECRET` | `dev-secret-change-me` (must match for bot and API) |
| `PORT` | `3000` |

Leave `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY_PATH`, and `ANTHROPIC_API_KEY` empty.

If `.env` is missing:

```bash
cp .env.example .env
```

Then paste the token. An empty `TELEGRAM_BOT_TOKEN=` makes the bot crash with `TELEGRAM_BOT_TOKEN is required`.

## 4. Install JS deps

```bash
cd "/Users/luminaenvision/Drift Bot"
pnpm install
```

This also runs `prisma generate`. Expect `added … packages` or `up to date`.

## 5. Start Postgres

```bash
pnpm db:up
```

Wait until healthy:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

Expect `postgres` **running** and **healthy**. Then:

```bash
docker compose -f infra/docker/docker-compose.yml exec postgres pg_isready -U drift -d driftbot
```

Expect `accepting connections`.

If port **5432** is already in use, stop the other Postgres or change the host port in `infra/docker/docker-compose.yml` and `DATABASE_URL`.

## 6. Run migrations

```bash
pnpm migrate
```

Expect Prisma to apply:

- `20260907120000_init`
- `20260907130000_trial_and_payments`

If this fails with a connection error, step 5 is not healthy yet.

## 7. Start the API (terminal 1)

```bash
cd "/Users/luminaenvision/Drift Bot"
pnpm dev:api
```

Expect a log line like `Server listening at http://127.0.0.1:3000`.

Leave this running. In another terminal:

```bash
curl -sS http://localhost:3000/health
```

Expect exactly:

```json
{"status":"ok"}
```

| Result | Meaning |
|---|---|
| `{"status":"ok"}` | API + Postgres are up |
| `{"status":"error"}` and HTTP 503 | API is up, Postgres is not reachable |
| `Failed to connect` | API is not running, or not on port 3000 |

## 8. Start the bot (terminal 2)

```bash
cd "/Users/luminaenvision/Drift Bot"
pnpm dev:bot
```

Expect `Drift Bot @<your_bot_username> is running`.

| Result | Meaning |
|---|---|
| that line | polling Telegram works |
| `TELEGRAM_BOT_TOKEN is required` | `.env` token is empty |
| `401 Unauthorized` | token is wrong |
| `409: terminated by other getUpdates` | another process is already polling this bot — kill it |

## 9. Smoke test in Telegram

Open the bot in Telegram (`t.me/<your_bot_username>` or search the name).

| Command | Expect |
|---|---|
| `/start` | Welcome + Paid trial (30 days left) + subscribe buttons |
| `/help` | Command list |
| `/tier` | Same plan text as `/start` |
| `/upgrade` | Paid / Premium Stars buttons |

`/upgrade` → **Pay with Stars** only works after you tap a plan; you do not need to complete a real payment for the local loop.

If `/start` says it could not reach the server, the API (step 7) is down, or `API_BASE_URL` / `INTERNAL_API_SECRET` in `.env` do not match.

## 10. Optional: unit tests (no Docker needed)

```bash
pnpm test
```

Expect all tests to pass (billing entitlements + audit catalog).

## Stop

- `Ctrl+C` in the API and bot terminals
- Postgres: `pnpm db:down` (add `-v` on the compose command only if you want to wipe the database)

## Done when

1. `curl http://localhost:3000/health` → `{"status":"ok"}`
2. Bot process logs `Drift Bot @… is running`
3. Telegram `/start` returns a 30-day Paid trial message

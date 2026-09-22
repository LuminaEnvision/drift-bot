# Deploy Drift Bot

Localhost dies when the laptop sleeps. Production is three always-on pieces that talk to each other:

1. **Postgres** on the internet
2. **API** with a public URL (the only process that talks to Postgres)
3. **Bot** that polls Telegram and calls the API

Same BotFather token. Same `INTERNAL_API_SECRET` on API and bot. Bot `API_BASE_URL` must be the live API URL, not localhost.

Railway is the shortest path. Render or Fly work the same way.

## 0. Stop the local bot first

Only one process can poll Telegram. In the laptop terminal running `pnpm dev:bot`, press Ctrl+C. Leave local API/Postgres alone if you still want them for yourself.

## 1. Push the code

The GitHub repo is already there: `https://github.com/LuminaEnvision/drift-bot`

Commit and push the latest if this machine is ahead of GitHub. Do not commit `.env`.

## 2. Create a Railway project

1. Sign in at https://railway.app
2. **New project** → **Deploy from GitHub repo** → `LuminaEnvision/drift-bot`
3. **New** → **Database** → **PostgreSQL**

Copy the Postgres `DATABASE_URL` Railway shows.

Generate a shared secret (do this once, paste into both services):

```bash
openssl rand -hex 32
```

## 3. API service

Rename the first GitHub service to `api` if you want. Railpack will fail on this repo (it thinks the monorepo is Nx / Next). Use the Dockerfile instead.

**Settings → Build**

- Builder: Dockerfile (or Config-as-code file: `/railway.api.json`)

**Start command:**

```bash
pnpm start:api
```

**Variables:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | from the Railway Postgres plugin (reference it) |
| `INTERNAL_API_SECRET` | the hex string from step 2 |
| `HOST` | `0.0.0.0` |
| `TRIAL_DAYS` | `30` |
| `PAID_STARS_MONTHLY` | `150` |
| `PREMIUM_STARS_MONTHLY` | `500` |
| `GITHUB_TOKEN` | optional. A GitHub PAT raises the API rate limit |

Railway sets `PORT` for you. Do not set `API_BASE_URL` here.

Wait until the service is live. Open `/health` on the public domain. Expect `{"status":"ok"}`.

Copy that public URL, like `https://drift-api-production.up.railway.app`. No trailing slash.

## 4. Bot service

**New service** from the same GitHub repo. Call it `bot`.

**Settings → Config-as-code file:** `/railway.bot.json` so this service does not start the API.

**Start command:**

```bash
pnpm start:bot
```

**Variables:**

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | same BotFather token as local `.env` |
| `API_BASE_URL` | the API public URL from step 3 |
| `INTERNAL_API_SECRET` | the **same** hex string as the API |

No `DATABASE_URL` on the bot. It never talks to Postgres.

Logs should say `Drift Bot @RepoDriftBot is running`.

## 5. Smoke test on your phone

You do not need the laptop on.

| Check | Expect |
|---|---|
| API `/health` | `{"status":"ok"}` |
| Telegram `/start` | welcome + trial |
| Paste `owner/repo` or a github.com link | `Checking …` then watch confirmation |
| `/audit_secrets` | `On it. Cloning…` then findings |

If `/start` is silent, the bot service is down or the local bot is still polling.

If connect fails with an API error, `API_BASE_URL` or `INTERNAL_API_SECRET` do not match.

## Notes

- Public GitHub repos only. Private repos wait on the GitHub App.
- Audits clone on the API box. The image includes `git` via `nixpacks.toml`.
- Stars checkout works on this same bot. No Stripe.
- To update: push to GitHub. Railway redeploys both services. The API start command runs migrations.

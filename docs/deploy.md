# Deploy Drift Bot on Railway, from a blank project

You need three boxes on one Railway canvas:

1. **Postgres** (database)
2. **api** (the website the bot calls)
3. **bot** (talks to Telegram)

Same GitHub repo for api and bot. Only the api box talks to Postgres.

Do not add the bot until `/health` on the api domain shows `{"status":"ok"}`.

---

## 0. Before Railway

On your Mac, local `pnpm dev:bot` must be stopped. Only one process can poll Telegram.

Have these two values ready:

- BotFather token, from your laptop `.env` line `TELEGRAM_BOT_TOKEN=`
- A shared password. In Terminal:

```bash
openssl rand -hex 32
```

Copy the hex. You will paste it twice later, once on api and once on bot. That is `INTERNAL_API_SECRET`. It is not in a second file. `.env` is only for your laptop.

Repo: `https://github.com/LuminaEnvision/drift-bot`

---

## 1. New Railway project from GitHub

1. Open https://railway.app and sign in with GitHub.
2. Click **New** (or **New project**).
3. Click **Deploy from GitHub repo**.
4. If asked, allow Railway to see `LuminaEnvision/drift-bot`.
5. Click **drift-bot**.

Railway creates a project and one service from that repo. That first service is the **API**. Rename it so you do not mix it up:

1. Click the service card.
2. Open the three dots or the name at the top.
3. Rename to `api`.

If a deploy starts and fails, ignore it for now. Variables are not set yet.

---

## 2. Add Postgres

1. On the canvas (the dotted page with cards), click **+** (top right) or **+ New**.
2. Click **Database**.
3. Click **PostgreSQL**.
4. Wait until the Postgres card says it is running. Not offline. Not crashed.

You now have two cards: **Postgres** and **api**.

---

## 3. Wire the API to Postgres

1. Click the **api** card.
2. Click **Variables**.
3. Click **New variable** (or **Add a variable**).
4. Use **Add a reference** / **Variable reference** if you see it:
   - Service: **Postgres**
   - Variable: `DATABASE_URL`
5. If you do not see a reference picker:
   - Click the **Postgres** card → **Variables**.
   - Copy `DATABASE_URL`.
   - Go back to **api** → **Variables**.
   - Name: `DATABASE_URL`
   - Value: paste that string.

Add these on **api** as well (New variable for each):

| Name | Value |
|---|---|
| `INTERNAL_API_SECRET` | the hex from `openssl rand -hex 32` |
| `HOST` | `0.0.0.0` |

Optional, same as local:

| Name | Value |
|---|---|
| `TRIAL_DAYS` | `30` |
| `PAID_STARS_MONTHLY` | `150` |
| `PREMIUM_STARS_MONTHLY` | `500` |

Do not add `TELEGRAM_BOT_TOKEN` or `API_BASE_URL` on api.

Save. Railway often redeploys by itself.

---

## 4. Start command for the API

1. Still on **api**, click **Settings**.
2. Find **Custom Start Command**.
3. Set it to:

```text
pnpm start:api
```

4. **Root Directory** must be empty. Do not type `apps/api`.
5. If you see **Config as code**, set `/railway.json`.
6. Redeploy if it did not start on its own: **Deployments** → **Redeploy**.

Wait for the deploy to finish green.

**Logs** (api → Deployments → latest → View logs) should show something like `Server listening`.

If it crashes, open the red deploy and read the last 20 lines. Common causes:

- Postgres still offline
- `DATABASE_URL` missing
- Start command not `pnpm start:api`

---

## 5. Public URL and health check

1. **api** → **Settings** → **Networking**.
2. Click **Generate Domain**.
3. Copy the URL. Example: `https://api-production-xxxx.up.railway.app`
4. In a browser open:

```text
https://YOUR-DOMAIN/health
```

You want exactly:

```json
{"status":"ok"}
```

If you get an error page or 503, the API is not talking to Postgres. Fix that before step 6.

Copy the domain **without** `/health` and **without** a slash at the end. That is `API_BASE_URL` for the bot.

---

## 6. Add the bot (second GitHub service)

1. Canvas → **+** → **GitHub Repo**.
2. Pick **the same** repo: `LuminaEnvision/drift-bot`.
3. Do not add another database.
4. A new card appears. Rename it `bot`.

**Settings on bot**

1. Click **bot** → **Settings**.
2. Root Directory: empty.
3. Config as code: `/railway.bot.json`
4. If there is no config field, set Custom Start Command to:

```text
pnpm start:bot
```

**Variables on bot** (only these three)

| Name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from laptop `.env` |
| `API_BASE_URL` | the api domain from step 5, like `https://api-production-xxxx.up.railway.app` |
| `INTERNAL_API_SECRET` | the **same** hex you put on api. Copy from api → Variables if you forgot it |

No `DATABASE_URL` on bot. No Generate Domain on bot.

Redeploy **bot**. Logs should say:

```text
Drift Bot @RepoDriftBot is running
```

If you see `409` or `terminated by other getUpdates`, something else is still using that token. Stop it.

---

## 7. Try it on your phone

Open @RepoDriftBot in Telegram.

| You send | You should get |
|---|---|
| `/start` | welcome + trial |
| a public `owner/repo` or github.com link | `Checking …` then confirmation |
| `/audit_secrets` | `On it. Cloning…` then a short summary, a PDF prompt, and a `.md` to paste into Cursor |
| `/digest` | cheap CVE + CI check now; automatic daily (Paid) or weekly (Free) pings after that |

---

## If you get lost

**The shared secret**

`.env` on your Mac is local only.

On Railway the password is two Variable rows with the same name and the same value:

- api → Variables → `INTERNAL_API_SECRET`
- bot → Variables → `INTERNAL_API_SECRET`

**The canvas**

| Card | Start command | Must have |
|---|---|---|
| Postgres | (none, it is a database) | running |
| api | `pnpm start:api` | `DATABASE_URL`, `INTERNAL_API_SECRET`, `HOST`, a public domain |
| bot | `pnpm start:bot` | `TELEGRAM_BOT_TOKEN`, `API_BASE_URL`, `INTERNAL_API_SECRET` |

Do not put the bot token on api. Do not put the database URL on bot.

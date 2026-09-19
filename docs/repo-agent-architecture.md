# Telegram repo-monitoring agent — architecture & build plan

## 1. What it does

A user connects one or more GitHub repos to the bot via Telegram. The agent:

- Runs a cheap daily check per repo: dependency drift, security advisories, framework-relevant changes
- Offers deeper, LLM-driven research on demand via bot commands: changelog synthesis, migration guidance, compatibility checks across the full dependency tree
- Gates daily frequency, repo count, and deep research usage by subscription tier
- Sends results back to the user as Telegram messages, with inline buttons for follow-up actions

## 2. Architecture

```
Telegram bot  <-->  Backend API  <-->  Postgres DB
                         |
          -----------------------------
          |                           |
      Scheduler                  On-demand commands
     (daily cron)                (deep research)
          |                           |
   Registries + CVEs           GitHub App  -->  Research engine
   (npm, PyPI, GHSA)           (repo reads)     (LLM + web search)
```

**Telegram bot layer**
Framework: grammY or Telegraf (Node/TS) or python-telegram-bot (Python). Handles slash commands, callback queries from inline keyboards, and message formatting. Stateless — every request carries a `telegram_user_id` that the backend resolves to an account.

**Backend API**
Owns auth, tier enforcement, rate limiting, and orchestration. Stateless HTTP service (Fastify/Express or FastAPI), horizontally scalable. This is the only component that talks to the DB directly.

**Scheduler**
Cron-triggered job (node-cron, or a scheduled Lambda/Cloud Run job, or BullMQ + a repeatable job) that enumerates all repos due for a daily check and enqueues one job per repo. Use a queue (BullMQ/Redis, or SQS) rather than looping synchronously, so a slow repo doesn't block others and failures can retry.

**GitHub App**
Not a personal access token per user — a proper GitHub App. Each user installs it on the specific repos they want to connect, so you get fine-grained read scopes and can receive installation/push/release webhooks later. Requires: App registration, a private key for JWT signing, and a small OAuth callback endpoint since Telegram can't do OAuth natively — the user taps a "Connect GitHub" button, it opens a web link, GitHub redirects back to your callback with a code, you exchange it and store the installation, then message the user in Telegram that it's linked.

**Registries + CVE sources**
npm registry API, PyPI JSON API, crates.io API, Go proxy, GitHub Advisory Database (GraphQL API) for CVEs. Called by the daily job only — cheap, no LLM needed for the minimum check unless you want a one-line natural-language summary at the end.

**Research engine**
Invoked only by deep-research commands. LLM call (Claude via Anthropic API) with web search enabled, given the repo's manifest, the specific dependency or version bump in question, and the user's question. This is the expensive path — gate it hard.

## 3. Data model

```sql
-- users, resolved from Telegram identity
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  tier            TEXT NOT NULL DEFAULT 'free', -- free | paid | premium
  tier_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- linked GitHub App installations
CREATE TABLE github_installations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  installation_id  BIGINT NOT NULL,
  github_account   TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- connected repos
CREATE TABLE repos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  installation_id  UUID NOT NULL REFERENCES github_installations(id),
  full_name        TEXT NOT NULL, -- e.g. "org/repo"
  default_branch   TEXT NOT NULL DEFAULT 'main',
  stack_fingerprint JSONB, -- detected languages/frameworks/manifests
  check_frequency  TEXT NOT NULL DEFAULT 'daily', -- daily | weekly, tier-gated
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, full_name)
);

-- results of daily minimum checks
CREATE TABLE daily_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id       UUID NOT NULL REFERENCES repos(id),
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  findings      JSONB NOT NULL, -- [{type: 'dep_update'|'cve', package, detail, severity}]
  summary_sent  BOOLEAN NOT NULL DEFAULT false
);

-- results of on-demand deep research
CREATE TABLE research_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id       UUID NOT NULL REFERENCES repos(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  command       TEXT NOT NULL, -- which command triggered it
  input_params  JSONB,
  result_text   TEXT,
  tokens_used   INTEGER,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- usage counters for tier rate limiting
CREATE TABLE usage_counters (
  user_id           UUID NOT NULL REFERENCES users(id),
  period_start      DATE NOT NULL, -- billing period or calendar month
  deep_research_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);
```

## 4. Command list

**Account & setup**
- `/start` — welcome message, explains what the bot does
- `/connect` — sends the GitHub App install/OAuth link
- `/repos` — lists connected repos with status (active, last checked)
- `/disconnect <repo>` — removes a repo from monitoring
- `/settings` — check frequency, notification time, digest format
- `/tier` — shows current tier, usage this period, upgrade link
- `/upgrade` — payment flow (Stripe checkout link, or wallet-linking flow for crypto payment)

**Daily digest control**
- `/digest_now` — force-run today's minimum check early (still tier-limited)
- `/pause <repo>` / `/resume <repo>` — toggle daily checks per repo

**Deep research (tier-gated, triggered by command or inline button under a digest message)**
- `/research <repo>` — opens an inline menu of research types for that repo
- `/changelog <repo> <package>` — synthesizes recent changelog/release notes for one dependency
- `/migrate <repo> <package> <target_version>` — migration guidance for a version bump
- `/compat <repo>` — full dependency-tree compatibility pass, flags conflicting version constraints
- `/security <repo>` — deep pass on open CVEs affecting the repo's actual usage, not just presence in the tree
- `/ask <repo> <free text>` — open-ended question about the repo's stack, answered with web search + repo context

**Meta**
- `/help` — command list
- `/feedback <text>` — forwards to you/a support channel

Inline buttons under every daily digest message ("Deep dive", "Ignore this update", "Snooze 7 days") route to the same commands via callback_query so users rarely need to type.

## 5. Tier structure

| | Free | Paid | Premium |
|---|---|---|---|
| Connected repos | 1 | 5 | unlimited |
| Daily check | weekly digest only | daily | daily, priority queue |
| Deep research | — | 5 / month | unlimited (soft rate limit) |
| Notification customization | — | yes | yes |

Enforce all limits in the backend API at request time against `usage_counters`, not just in bot-side UX — someone hitting the API directly (or a bug in the bot) shouldn't bypass billing logic.

## 6. Build order

1. **Skeleton**: Telegram bot with `/start`, `/help`; backend API with a health check; Postgres with the schema above; deploy both (Railway/Fly.io/Render are the fastest path for an MVP).
2. **GitHub connection**: register the GitHub App, build the OAuth callback page, wire `/connect` and `/repos`.
3. **Stack detection**: parse manifests on connect, store `stack_fingerprint`, show it back to the user so they can confirm it's right.
4. **Daily minimum check**: scheduler + queue, registry/CVE calls, digest message formatting, `/digest_now`.
5. **Tiers & payments**: `users.tier`, `usage_counters`, Stripe checkout (or crypto payment flow), `/tier` and `/upgrade`.
6. **Deep research**: `/research` menu, one command end-to-end (`/changelog` is the simplest to ship first), rate limiting against `usage_counters`.
7. **Remaining research commands**: `/migrate`, `/compat`, `/security`, `/ask`.
8. **Polish**: inline buttons on digests, `/settings`, `/pause`/`/resume`, error handling and retry on failed GitHub/registry calls.
9. **Webhooks (post-MVP)**: switch from polling to GitHub push/release webhooks to cut API usage at scale.

## 7. Initial Cursor prompt

Paste this as your first prompt in Cursor once you've picked Node/TS or Python and created an empty repo:

```
I'm building a Telegram bot that monitors GitHub repos for important dependency
updates and security issues, with free/paid/premium subscription tiers.

Stack: [Node.js + TypeScript + grammY + Fastify + Postgres | or your choice]

Set up the initial project structure:

1. A `bot/` package using grammY (or Telegraf) with a single `/start` command
   that replies with a welcome message.
2. An `api/` package using Fastify (or Express) with a `GET /health` endpoint
   returning { status: "ok" }.
3. A `db/` package with a Postgres connection (use `pg` or Prisma — your call,
   explain the tradeoff briefly) and a migration for this schema:
   [paste the SQL schema from section 3 above]
4. A root `docker-compose.yml` that runs Postgres locally for development.
5. A `.env.example` listing: TELEGRAM_BOT_TOKEN, DATABASE_URL,
   GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH, ANTHROPIC_API_KEY.
6. A README with setup steps: install deps, copy .env.example, run docker
   compose, run migrations, start bot and api in dev mode.

Keep it minimal and runnable — I want `docker compose up` + two `npm run dev`
commands to get a working `/start` reply and a passing health check before
we add GitHub integration. Don't add the GitHub App, scheduler, or deep
research yet — that's the next prompt.
```

Once that's running, the next Cursor prompt should be the GitHub App OAuth flow (step 2 in the build order) — worth doing as its own focused session since the OAuth callback page is the fiddliest part of the whole project.

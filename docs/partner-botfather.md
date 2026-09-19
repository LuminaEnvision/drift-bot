# Partner brief: create the Drift Bot Telegram bot

Send this to the person who can use BotFather. You cannot create a new bot on your account (`/newbot` is blocked). They create the bot; you keep the code and `.env`.

---

## Message to paste

Hi — I need you to create one Telegram bot for a product called **Drift Bot**. I cannot run `/newbot` on my account. Please use the official **@BotFather** (blue verified check) only. Do not use lookalike bots.

### What the product is

Drift Bot is a Telegram agent for developers. Users connect GitHub repos. The bot watches them for **dependency drift**, **security advisories (CVEs)**, and **framework-relevant changes**, and sends a **digest in Telegram**.

Later it will also run on-demand audits on the connected code: secrets (Gitleaks), dependencies, Semgrep, Solidity (Slither), and a “Break before launch” MVP review. Billing is a **30-day Paid trial**, then **Telegram Stars** (not Stripe).

The display name should stay **Drift Bot** even if the `@username` has to be different.

### Create the bot

1. Open Telegram → **@BotFather** → `/cancel` then `/newbot`.
2. **Name:** `Drift Bot`
3. **Username** (must end in `bot`, unique). Try in this order:
   - `RepoDriftBot`
   - `DriftAuditBot`
   - `DriftDigestBot`
   - `TheDriftBot`
   - `DriftWatchBot`
4. Save the **HTTP API token** (`123456789:AA...`). Treat it like a password. Send it to me in a **private** Telegram chat or a password manager — never in a group, email, or GitHub.

### Profile copy (BotFather → `/mybots` → our bot)

**About** (`/setabouttext`, max 120 characters):

```
Watches GitHub repos for dependency drift, CVEs, and pre-launch audits. Digests land in Telegram.
```

**Description** (`/setdescription`):

```
Drift Bot watches the GitHub repos you connect for dependency drift, security advisories, and framework-relevant changes, then sends a digest on Telegram.

On-demand audits: secrets, dependencies, code (Semgrep), smart contracts (Slither), and Break before launch — find critical bugs before your first 100 users do.

30-day Paid trial, then subscribe with Telegram Stars.
```

**Bot picture:** upload `docs/drift-bot-logo.png` from the Drift Bot repo (square PNG). If you do not have the file, I will send it.

**Commands** (`/setcommands`):

```
start - Welcome and start a 30-day Paid trial
help - Command list
tier - Current plan and trial
upgrade - Subscribe with Telegram Stars
```

Leave **group privacy** on (default). This bot is for private chats first.

### What I need back

1. The **@username** you got
2. The **API token** (privately)
3. Confirmation that About, Description, botpic, and commands are set

Do not deploy, do not add the token to git, and do not create extra bots. One bot is enough. I will put the token in our server `.env` as `TELEGRAM_BOT_TOKEN`.

Thanks.

---

## After you receive the token

1. Put it in the repo-root `.env` as `TELEGRAM_BOT_TOKEN=` (no quotes).
2. Do not commit `.env`.
3. Continue [docs/local-loop.md](./local-loop.md): `pnpm dev:api` and `pnpm dev:bot`.
4. In Telegram, open `t.me/<username>` and send `/start`.

# Drift Bot

Official product repo. Not open source. Not a template.

Use the bot on Telegram: **[@RepoDriftBot](https://t.me/RepoDriftBot)**

Do not clone this to run your own instance. All rights reserved.

---

Drift Bot watches the public GitHub repos you connect. It checks known CVEs and GitHub Actions on a schedule, and it can run a full pre-launch audit when you ask. Results come back in Telegram. The full audit also sends a PDF and a markdown file you can paste into Cursor.

## What it does

**Watch**
- `/connect owner/repo` or paste a github.com link
- Remembers the repo. `/repos` lists it. `/disconnect` drops it
- Public GitHub repos only

**Automatic digest**
- Cheap pass: known CVEs plus CI on the default branch
- Messages you when something changes. Stays quiet if nothing did
- `/digest` runs that check now
- Daily on trial, Paid, and Premium. Weekly on Free

**On-demand audits**
- `/audit_secrets` leaked keys
- `/audit_deps` known CVEs
- `/audit_code` risky patterns
- `/audit_contracts` Solidity footguns (if there are `.sol` files)
- `/audit_surface` public site door check (headers, accidental `.env` / `.git`). Not a live bot-attack feed
- `/audit` Break before launch: all of the above. Fix every P0. This one sends a PDF and a `.md`

**Account**
- `/start` 30-day Paid trial. No card
- `/tier` your plan
- `/upgrade` subscribe with Telegram Stars. Telegram Wallet works
- `/help` the list

## Plans

| | Free | Paid (150 Stars / 30 days) | Premium (500 Stars / 30 days) |
|---|---|---|---|
| Repos | 1 | 5 | unlimited |
| Digest | weekly | daily | daily, first in line |
| Audits | yes | yes | yes |

After the trial you drop to Free unless you subscribe. Free does not expire.

## Not in yet

- Private repos
- Deep research (`/ask`, `/changelog`, `/migrate`, `/compat`)

## License

Copyright (c) 2026 Lumina Envision. All rights reserved.

This software is the proprietary product Drift Bot. You may not copy, modify, distribute, or run your own instance without written permission. Use the product through the official Telegram bot.

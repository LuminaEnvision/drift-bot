#!/bin/sh
set -eu

if [ "${DRIFT_ROLE:-}" = "bot" ]; then
  echo "Starting Telegram bot"
  exec pnpm --filter @drift-bot/bot start
fi

if [ "${DRIFT_ROLE:-}" = "api" ]; then
  exec sh scripts/start-api.sh
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -z "${DATABASE_URL:-}" ] && [ -z "${DATABASE_PRIVATE_URL:-}" ] && [ -z "${PGHOST:-}" ]; then
  echo "No database URL. Starting Telegram bot."
  exec pnpm --filter @drift-bot/bot start
fi

exec sh scripts/start-api.sh

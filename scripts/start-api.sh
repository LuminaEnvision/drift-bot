#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is missing on the api service."
  echo "Add it as a variable reference to Postgres → DATABASE_URL, then redeploy."
  exit 1
fi

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
echo "Starting API on ${HOST}:${PORT}"

i=1
while [ "$i" -le 10 ]; do
  if pnpm --filter @drift-bot/db migrate; then
    break
  fi
  echo "Migrate failed (try ${i}/10). Waiting for Postgres..."
  i=$((i + 1))
  sleep 3
done

if [ "$i" -gt 10 ]; then
  echo "Could not reach Postgres. Open the Postgres card and make sure it is running."
  exit 1
fi

exec pnpm --filter @drift-bot/api start

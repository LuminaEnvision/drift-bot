#!/bin/sh
set -eu

echo "DB env: DATABASE_URL=${DATABASE_URL:+set} DATABASE_PRIVATE_URL=${DATABASE_PRIVATE_URL:+set} DATABASE_PUBLIC_URL=${DATABASE_PUBLIC_URL:+set} PGHOST=${PGHOST:+set}"

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_PRIVATE_URL:-}" ]; then
  export DATABASE_URL="$DATABASE_PRIVATE_URL"
  echo "Using DATABASE_PRIVATE_URL"
fi

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_PUBLIC_URL:-}" ]; then
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  echo "Using DATABASE_PUBLIC_URL"
fi

if [ -z "${DATABASE_URL:-}" ] && [ -n "${PGHOST:-}" ] && [ -n "${PGUSER:-}" ] && [ -n "${PGPASSWORD:-}" ]; then
  export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-railway}"
  echo "Built DATABASE_URL from PGHOST"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is still missing on the api service."
  echo "On api → Variables add a variable named DATABASE_URL with value \${{Postgres.DATABASE_URL}}"
  echo "Service name must match the Postgres card exactly, then Redeploy."
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

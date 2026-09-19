CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users, resolved from Telegram identity
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  tier             TEXT NOT NULL DEFAULT 'free',
  tier_expires_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  installation_id   UUID NOT NULL REFERENCES github_installations(id),
  full_name         TEXT NOT NULL,
  default_branch    TEXT NOT NULL DEFAULT 'main',
  stack_fingerprint JSONB,
  check_frequency   TEXT NOT NULL DEFAULT 'daily',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, full_name)
);

-- results of daily minimum checks
CREATE TABLE daily_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id      UUID NOT NULL REFERENCES repos(id),
  ran_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  findings     JSONB NOT NULL,
  summary_sent BOOLEAN NOT NULL DEFAULT false
);

-- results of on-demand deep research
CREATE TABLE research_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id       UUID NOT NULL REFERENCES repos(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  command       TEXT NOT NULL,
  input_params  JSONB,
  result_text   TEXT,
  tokens_used   INTEGER,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- usage counters for tier rate limiting
CREATE TABLE usage_counters (
  user_id            UUID NOT NULL REFERENCES users(id),
  period_start       DATE NOT NULL,
  deep_research_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);

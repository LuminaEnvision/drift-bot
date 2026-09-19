ALTER TABLE users
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN star_charge_id TEXT;

CREATE TABLE checkout_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  plan         TEXT NOT NULL,
  stars        INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE payments (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL REFERENCES users(id),
  checkout_session_id        UUID NOT NULL REFERENCES checkout_sessions(id),
  telegram_payment_charge_id TEXT UNIQUE NOT NULL,
  provider_payment_charge_id TEXT NOT NULL DEFAULT '',
  currency                   TEXT NOT NULL,
  stars                      INTEGER NOT NULL,
  plan                       TEXT NOT NULL,
  is_recurring               BOOLEAN NOT NULL DEFAULT false,
  is_first_recurring         BOOLEAN NOT NULL DEFAULT false,
  subscription_expires_at    TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

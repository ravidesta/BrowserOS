-- Luminous Multitool — initial schema
-- Runs automatically on first Postgres start via
-- /docker-entrypoint-initdb.d in docker-compose.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forgejo_user_id INTEGER UNIQUE,
  stripe_connect_account_id TEXT UNIQUE,
  display_name TEXT NOT NULL,
  contract_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  is_enterprise BOOLEAN NOT NULL DEFAULT FALSE,
  forgejo_repo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listings_vendor_idx ON listings (vendor_id);
CREATE INDEX IF NOT EXISTS listings_active_idx ON listings (active) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  buyer_email TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  commission_rate NUMERIC(5, 4) NOT NULL,
  commission_cents INTEGER NOT NULL CHECK (commission_cents >= 0),
  vendor_payout_cents INTEGER NOT NULL CHECK (vendor_payout_cents >= 0),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deals_vendor_idx ON deals (vendor_id);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals (status);

CREATE TABLE IF NOT EXISTS timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  sha256_hex TEXT NOT NULL,
  ots_bytes BYTEA NOT NULL,
  btc_height INTEGER,
  btc_time TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (artifact_type, artifact_id)
);

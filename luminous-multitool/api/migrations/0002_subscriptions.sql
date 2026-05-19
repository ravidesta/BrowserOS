-- Subscriptions (the $0 / $99-yr / $299-mo tiers).
-- Tied to a Forgejo user rather than a vendor — anyone can subscribe,
-- even users who never sell anything in the marketplace.

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forgejo_user_id INTEGER NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'annual', 'pro')),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_tier_idx ON subscriptions (tier);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);

-- =============================================================
-- Migration 001: Add user subscriptions
-- =============================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL UNIQUE REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    plan                  TEXT        NOT NULL DEFAULT 'free',
    interviews_allowed    INT         NOT NULL DEFAULT 5,
    interviews_used       INT         NOT NULL DEFAULT 0,
    status                TEXT        NOT NULL DEFAULT 'active',
    current_period_start  TIMESTAMPTZ,
    current_period_end    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions (plan);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_subscriptions_owner_policy
    ON user_subscriptions
    USING (user_id = auth.uid());

-- Seed a default 'free' subscription for existing users who don't have one
INSERT INTO user_subscriptions (user_id, plan, interviews_allowed, interviews_used, status)
SELECT
    user_id,
    'free',
    2,
    LEAST(
        COALESCE((SELECT COUNT(*) FROM interviews WHERE interviews.user_id = user_profiles.user_id), 0),
        2
    ),
    'active'
FROM user_profiles
WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions WHERE user_subscriptions.user_id = user_profiles.user_id
);

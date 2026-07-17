-- =============================================================
-- Migration 002: Add Razorpay fields to user_subscriptions
-- =============================================================

ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_order
    ON user_subscriptions (razorpay_order_id);

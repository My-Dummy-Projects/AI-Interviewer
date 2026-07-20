-- Add terms_accepted column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false;

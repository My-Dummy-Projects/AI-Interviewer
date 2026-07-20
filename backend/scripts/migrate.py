"""
Single migration script for Voxa.
Connects to a new Supabase project and runs the full schema.

Usage:
    python scripts/migrate.py                          # prompts for DB password
    python scripts/migrate.py --db-password <pass>     # pass directly
    SUPABASE_DB_PASSWORD=<pass> python scripts/migrate.py   # via env var

Environment variables used (from backend/.env):
    SUPABASE_URL            — https://<project>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY — service role JWT (validated on connect)

One additional variable needed:
    SUPABASE_DB_PASSWORD    — database password from Supabase dashboard
"""

import os
import re
import sys
import argparse

try:
    from dotenv import load_dotenv
except ImportError:
    print("Installing python-dotenv...")
    os.system(f"{sys.executable} -m pip install python-dotenv --quiet")
    from dotenv import load_dotenv

# ── Load .env ─────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
dotenv_path = os.path.join(BACKEND_DIR, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f"  Loaded env from: {dotenv_path}")
else:
    print(f"  No .env found at {dotenv_path}, using system env")

# ── Full Schema ───────────────────────────────────────────────────
SCHEMA_SQL = """
-- =============================================================
-- Voxa — Full Database Schema
-- Run this against a fresh Supabase project to create all
-- tables, indexes, triggers, RLS policies, and seed data.
-- =============================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL UNIQUE,
    email           TEXT        NOT NULL,
    display_name    TEXT        NOT NULL DEFAULT '',
    avatar_url      TEXT        NOT NULL DEFAULT '',
    bio             TEXT        NOT NULL DEFAULT '',
    terms_accepted  BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- 2. Feedback Entries
CREATE TABLE IF NOT EXISTS feedback_entries (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    email       TEXT        NOT NULL DEFAULT '',
    feedback    TEXT        NOT NULL,
    rating      INT         NULL CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    category    TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_user_id ON feedback_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_created_at ON feedback_entries (created_at DESC);

-- 3. Interviews
CREATE TABLE IF NOT EXISTS interviews (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    job_role          TEXT        NOT NULL,
    experience_level  TEXT        NOT NULL,
    duration_minutes  INT         NOT NULL DEFAULT 0,
    overall_score     INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews (user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews (created_at DESC);

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS final_recommendation TEXT
    CHECK (final_recommendation IN ('Strong Hire', 'Hire', 'Lean Hire', 'No Hire'));
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript JSONB NOT NULL DEFAULT '[]';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS report JSONB NOT NULL DEFAULT '{}';

-- 4. Transcript Turns
CREATE TABLE IF NOT EXISTS transcript_turns (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    role          TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    text          TEXT        NOT NULL DEFAULT '',
    "timestamp"   INT         NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_transcript_turns_interview_id ON transcript_turns (interview_id);

-- 5. Skill Scores
CREATE TABLE IF NOT EXISTS skill_scores (
    id               UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id     UUID   NOT NULL UNIQUE REFERENCES interviews (id) ON DELETE CASCADE,
    technical        INT    NOT NULL DEFAULT 0 CHECK (technical BETWEEN 0 AND 100),
    communication    INT    NOT NULL DEFAULT 0 CHECK (communication BETWEEN 0 AND 100),
    problem_solving  INT    NOT NULL DEFAULT 0 CHECK (problem_solving BETWEEN 0 AND 100),
    confidence       INT    NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100)
);

-- 6. Question Evaluations
CREATE TABLE IF NOT EXISTS question_evaluations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id    UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    question        TEXT        NOT NULL,
    answer_summary  TEXT        NOT NULL DEFAULT '',
    score           INT         NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    feedback        TEXT        NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_question_evaluations_interview_id ON question_evaluations (interview_id);

-- 7. Interview Strengths
CREATE TABLE IF NOT EXISTS interview_strengths (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    text          TEXT        NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_strengths_interview_id ON interview_strengths (interview_id);

-- 8. Interview Improvements
CREATE TABLE IF NOT EXISTS interview_improvements (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    text          TEXT        NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_improvements_interview_id ON interview_improvements (interview_id);

-- 9. Learning Suggestions
CREATE TABLE IF NOT EXISTS learning_suggestions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    text          TEXT        NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suggestions_interview_id ON learning_suggestions (interview_id);

-- 10. User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL UNIQUE REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    plan                  TEXT        NOT NULL DEFAULT 'free',
    interviews_allowed    INT         NOT NULL DEFAULT 5,
    interviews_used       INT         NOT NULL DEFAULT 0,
    status                TEXT        NOT NULL DEFAULT 'active',
    current_period_start  TIMESTAMPTZ,
    current_period_end    TIMESTAMPTZ,
    razorpay_order_id     TEXT,
    razorpay_payment_id   TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions (plan);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_order ON user_subscriptions (razorpay_order_id);

-- ── Updated-at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row-Level Security ───────────────────────────────────────────
ALTER TABLE user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_turns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_evaluations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_strengths    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_suggestions   ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────
CREATE POLICY user_profiles_owner_policy
    ON user_profiles
    USING (user_id = auth.uid());

CREATE POLICY user_subscriptions_owner_policy
    ON user_subscriptions
    USING (user_id = auth.uid());

CREATE POLICY feedback_entries_owner_policy
    ON feedback_entries
    USING (user_id = auth.uid());

CREATE POLICY interviews_owner_policy
    ON interviews
    USING (user_id = auth.uid());

CREATE POLICY transcript_turns_owner_policy
    ON transcript_turns
    USING (interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
    ));

CREATE POLICY skill_scores_owner_policy
    ON skill_scores
    USING (interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
    ));

CREATE POLICY question_evaluations_owner_policy
    ON question_evaluations
    USING (interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
    ));

CREATE POLICY interview_strengths_owner_policy
    ON interview_strengths
    USING (interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
    ));

CREATE POLICY interview_improvements_owner_policy
    ON interview_improvements
    USING (interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
    ));

CREATE POLICY learning_suggestions_owner_policy
    ON learning_suggestions
    USING (interview_id IN (
        SELECT id FROM interviews WHERE user_id = auth.uid()
    ));

-- ── Seed: Free subscription for existing users ───────────────────
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
"""


def main():
    parser = argparse.ArgumentParser(description="Migrate Voxa database schema to a new Supabase project")
    parser.add_argument("--db-password", help="Supabase database password (from dashboard → Database Settings)")
    parser.add_argument("--host", help="Override database host (default: derived from SUPABASE_URL)")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL", "")
    if not supabase_url:
        print("ERROR: SUPABASE_URL is not set in environment or .env file")
        sys.exit(1)

    # Parse project reference from URL (e.g., https://abc123.supabase.co → abc123)
    match = re.search(r"https?://([^.]+)\.supabase\.", supabase_url)
    if not match:
        print(f"ERROR: Could not parse project reference from SUPABASE_URL: {supabase_url}")
        print("  Expected format: https://<project>.supabase.co")
        sys.exit(1)

    project_ref = match.group(1)
    db_host = args.host or f"db.{project_ref}.supabase.co"
    db_port = "5432"

    # Database password
    db_password = args.db_password or os.environ.get("SUPABASE_DB_PASSWORD")
    if not db_password:
        db_password = input(f"  Enter database password for project '{project_ref}' (from Supabase Dashboard → Database Settings): ").strip()
        if not db_password:
            print("ERROR: Database password is required")
            sys.exit(1)

    conn_str = f"postgresql://postgres:{db_password}@{db_host}:{db_port}/postgres"

    print(f"\n  Target project:   {project_ref}")
    print(f"  Database host:    {db_host}:{db_port}")
    print(f"  Database:         postgres")
    print()

    confirm = input("  This will create ALL tables in the target database. Continue? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("  Aborted.")
        sys.exit(0)

    # Try psycopg2 first
    try:
        import psycopg2
    except ImportError:
        print("  psycopg2 not found. Installing...")
        os.system(f"{sys.executable} -m pip install psycopg2-binary --quiet")
        try:
            import psycopg2
        except ImportError:
            print("ERROR: Failed to install psycopg2. Try manually: pip install psycopg2-binary")
            sys.exit(1)

    conn = None
    try:
        print("  Connecting...")
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()

        print("  Running schema migration...")
        cur.execute(SCHEMA_SQL)

        # Verify
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
        tables = [row[0] for row in cur.fetchall()]
        print(f"\n  Success! {len(tables)} tables created:")
        for t in tables:
            print(f"    - {t}")

        cur.close()
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

    print("\n  ── Next steps ──")
    print(f"  1. Update backend/.env with the new project's SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    print(f"  2. If you have existing data, use Supabase Dashboard → SQL Editor to run a pg_dump restore")
    print(f"  3. Deploy the backend and verify: curl {supabase_url}/rest/v1/rpc/")
    print("  Done.")


if __name__ == "__main__":
    main()

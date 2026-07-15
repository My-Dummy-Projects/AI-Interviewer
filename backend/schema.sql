-- =============================================================
-- AI Mock Interviewer — Database Schema (PostgreSQL)
-- =============================================================
-- This schema defines the Postgres/Supabase relational model for
-- interview history, user profiles, and feedback persistence.
-- =============================================================

-- ─── Profiles ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL UNIQUE,
    email           TEXT        NOT NULL,
    display_name    TEXT        NOT NULL DEFAULT '',
    avatar_url      TEXT        NOT NULL DEFAULT '',
    bio             TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

-- ─── Feedback Entries ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback_entries (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    email       TEXT        NOT NULL DEFAULT '',
    feedback    TEXT        NOT NULL,
    rating      INT         NULL CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    category    TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_entries_user_id ON feedback_entries (user_id);
CREATE INDEX idx_feedback_entries_created_at ON feedback_entries (created_at DESC);

-- ─── Interviews ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interviews (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES user_profiles (user_id) ON DELETE CASCADE,
    job_role          TEXT        NOT NULL,
    experience_level  TEXT        NOT NULL,
    duration_minutes  INT         NOT NULL DEFAULT 0,
    overall_score     INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_user_id    ON interviews (user_id);
CREATE INDEX idx_interviews_created_at ON interviews (created_at DESC);

-- ─── Interview Transcripts ────────────────────────────────────

CREATE TABLE IF NOT EXISTS transcript_turns (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    role          TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    text          TEXT        NOT NULL DEFAULT '',
    "timestamp"   INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_transcript_turns_interview_id ON transcript_turns (interview_id);

-- ─── Skill Scores (per interview) ─────────────────────────────

CREATE TABLE IF NOT EXISTS skill_scores (
    id               UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id     UUID   NOT NULL UNIQUE REFERENCES interviews (id) ON DELETE CASCADE,
    technical        INT    NOT NULL DEFAULT 0 CHECK (technical BETWEEN 0 AND 100),
    communication    INT    NOT NULL DEFAULT 0 CHECK (communication BETWEEN 0 AND 100),
    problem_solving  INT    NOT NULL DEFAULT 0 CHECK (problem_solving BETWEEN 0 AND 100),
    confidence       INT    NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100)
);

-- ─── Question Evaluations (per interview) ─────────────────────

CREATE TABLE IF NOT EXISTS question_evaluations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id    UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    question        TEXT        NOT NULL,
    answer_summary  TEXT        NOT NULL DEFAULT '',
    score           INT         NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    feedback        TEXT        NOT NULL DEFAULT ''
);

CREATE INDEX idx_question_evaluations_interview_id ON question_evaluations (interview_id);

-- ─── Interview Strengths & Improvements ───────────────────────

CREATE TABLE IF NOT EXISTS interview_strengths (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    text          TEXT        NOT NULL
);

CREATE INDEX idx_strengths_interview_id ON interview_strengths (interview_id);

CREATE TABLE IF NOT EXISTS interview_improvements (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    text          TEXT        NOT NULL
);

CREATE INDEX idx_improvements_interview_id ON interview_improvements (interview_id);

-- ─── Learning Suggestions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_suggestions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id  UUID        NOT NULL REFERENCES interviews (id) ON DELETE CASCADE,
    text          TEXT        NOT NULL
);

CREATE INDEX idx_suggestions_interview_id ON learning_suggestions (interview_id);

-- ─── Final Recommendation (per interview) ─────────────────────

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS final_recommendation TEXT
    CHECK (final_recommendation IN ('Strong Hire', 'Hire', 'Lean Hire', 'No Hire'));

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript JSONB NOT NULL DEFAULT '[]';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS report JSONB NOT NULL DEFAULT '{}';

-- ─── Updated-at trigger ───────────────────────────────────────

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

-- ─── Row-Level Security (Supabase) ────────────────────────────

ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_turns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_evaluations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_strengths   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_suggestions  ENABLE ROW LEVEL SECURITY;

-- ─── RLS policies: users can only access their own data ───────

CREATE POLICY user_profiles_owner_policy
    ON user_profiles
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

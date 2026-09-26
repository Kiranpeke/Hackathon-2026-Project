-- =============================================================================
-- supabase/schema.sql
--
-- Learnly – Bayesian Knowledge Tracing database schema
-- Compatible with Supabase (PostgreSQL 15+)
--
-- Run this against your Supabase project via the SQL editor or the CLI:
--   supabase db reset   (local)
--   supabase db push    (linked remote project)
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() if not already enabled.
-- On Supabase this extension is available by default.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. students
-- =============================================================================
-- Stores one row per learner.  `external_id` is the application-level user
-- identifier (e.g. Supabase Auth uid or a third-party SSO subject).
-- =============================================================================

CREATE TABLE IF NOT EXISTS students (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT        NOT NULL UNIQUE,          -- e.g. auth.uid()
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current automatically.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER students_set_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index: look up a student by their external (auth) identifier.
CREATE INDEX IF NOT EXISTS idx_students_external_id ON students (external_id);

-- =============================================================================
-- 2. concept_mastery
-- =============================================================================
-- One row per (student, concept) pair.  Updated after every attempt to
-- reflect the latest BKT posterior.
-- =============================================================================

CREATE TYPE difficulty_tier AS ENUM ('Easy', 'Medium', 'Hard');

CREATE TABLE IF NOT EXISTS concept_mastery (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID            NOT NULL
                                        REFERENCES students (id)
                                        ON DELETE CASCADE,
    concept             TEXT            NOT NULL,    -- ConceptId: 'Algebra', etc.
    p_known             NUMERIC(6, 5)   NOT NULL     -- p(Known) ∈ [0, 1]
                                        CHECK (p_known >= 0 AND p_known <= 1),
    mastery             BOOLEAN         NOT NULL DEFAULT FALSE,
    difficulty          difficulty_tier  NOT NULL DEFAULT 'Hard',
    consecutive_correct INTEGER         NOT NULL DEFAULT 0
                                        CHECK (consecutive_correct >= 0),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Each student has exactly one mastery row per concept.
    CONSTRAINT uq_concept_mastery_student_concept UNIQUE (student_id, concept)
);

CREATE OR REPLACE TRIGGER concept_mastery_set_updated_at
    BEFORE UPDATE ON concept_mastery
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index: fetch all concept states for a student in one query.
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_id
    ON concept_mastery (student_id);

-- Index: look up mastery for a specific student + concept pair.
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_concept
    ON concept_mastery (student_id, concept);

-- =============================================================================
-- 3. attempts
-- =============================================================================
-- Immutable audit log of every question attempt.  Never updated after insert.
-- =============================================================================

CREATE TABLE IF NOT EXISTS attempts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID            NOT NULL
                                    REFERENCES students (id)
                                    ON DELETE CASCADE,
    concept         TEXT            NOT NULL,           -- ConceptId
    correct         BOOLEAN         NOT NULL,
    difficulty      difficulty_tier  NOT NULL,
    p_known_before  NUMERIC(6, 5)   NOT NULL
                                    CHECK (p_known_before >= 0 AND p_known_before <= 1),
    p_known_after   NUMERIC(6, 5)   NOT NULL
                                    CHECK (p_known_after >= 0 AND p_known_after <= 1),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index: time-ordered history for a student (dashboard, reports).
CREATE INDEX IF NOT EXISTS idx_attempts_student_id_created_at
    ON attempts (student_id, created_at DESC);

-- Index: all attempts for a specific concept across all students (analytics).
CREATE INDEX IF NOT EXISTS idx_attempts_concept
    ON attempts (concept);

-- Index: per-student, per-concept history (mastery progression chart).
CREATE INDEX IF NOT EXISTS idx_attempts_student_concept
    ON attempts (student_id, concept, created_at DESC);

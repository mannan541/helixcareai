-- HelixCareAI Autism Therapy Platform - PostgreSQL schema with pgvector
-- Idempotent: safe to run multiple times (CREATE IF NOT EXISTS, DROP TRIGGER IF EXISTS).
-- Run with: npm run db:schema (from backend) or psql ... -f database/schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============== USERS ==============
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'therapist', 'parent')),
  title         VARCHAR(255),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at    TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ
);

-- Approval: NULL = pending (signup), NOT NULL = approved. Existing users get approved when column is added.
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN approved_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Disabled: NULL = active, NOT NULL = disabled (cannot login; existing sessions rejected).
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN disabled_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- is_active: false when user is disabled or soft-deleted (data integrity + compliance).
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- Backfill: set is_active = false where disabled or deleted (run after column exists)
DO $$ BEGIN UPDATE users SET is_active = false WHERE (disabled_at IS NOT NULL OR deleted_at IS NOT NULL); END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN title VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN mobile_number VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Therapist only: when true, parent can see therapist's mobile number on sessions.
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN show_mobile_to_parents BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============== CHILDREN ==============
-- ON DELETE RESTRICT: do not cascade delete; preserve child/therapy data when user is soft-deleted.
CREATE TABLE IF NOT EXISTS children (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  first_name    VARCHAR(255) NOT NULL,
  last_name     VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  notes         TEXT,
  diagnosis     TEXT,
  referred_by   TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at    TIMESTAMPTZ
);

-- Ensure children FK is RESTRICT (for DBs created before this change).
DO $$
BEGIN
  ALTER TABLE children DROP CONSTRAINT IF EXISTS children_user_id_fkey;
  ALTER TABLE children ADD CONSTRAINT children_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- Add optional columns if table already existed without them
DO $$
BEGIN
  ALTER TABLE children ADD COLUMN diagnosis TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE children ADD COLUMN referred_by TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============== SESSIONS ==============
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  therapist_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  session_date      DATE NOT NULL,
  duration_minutes  INTEGER,
  notes_text        TEXT,
  structured_metrics JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_structured_metrics ON sessions USING GIN (structured_metrics);

-- ============== NOTIFICATIONS ==============
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(500) NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta       JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============== EMBEDDINGS (pgvector for RAG) ==============
CREATE TABLE IF NOT EXISTS embeddings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536) NOT NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_embeddings_child_id ON embeddings(child_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_session_id ON embeddings(session_id);
-- Cosine distance for similarity search (<=> operator)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============== THERAPY EMBEDDINGS (Gemini text-embedding, 768 dims) ==============
CREATE TABLE IF NOT EXISTS therapy_embeddings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  note_text  TEXT NOT NULL,
  embedding  VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_therapy_embeddings_child_id ON therapy_embeddings(child_id);
CREATE INDEX IF NOT EXISTS idx_therapy_embeddings_session_id ON therapy_embeddings(session_id);
-- L2 distance for similarity search (<-> operator)
CREATE INDEX IF NOT EXISTS idx_therapy_embeddings_vector ON therapy_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- ============== SESSION COMMENTS (e.g. parents add comments on sessions) ==============
CREATE TABLE IF NOT EXISTS session_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment     TEXT NOT NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_session_comments_session_id ON session_comments(session_id);

-- Add therapist_id, updated_by, deleted_by, deleted_at if table already existed without them
DO $$
BEGIN
  ALTER TABLE sessions ADD COLUMN therapist_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE sessions ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE sessions ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE sessions ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add audit + soft-delete columns to users
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add audit + soft-delete columns to children
DO $$
BEGIN
  ALTER TABLE children ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE children ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE children ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE children ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add audit + soft-delete columns to session_comments
DO $$
BEGIN
  ALTER TABLE session_comments ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE session_comments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE session_comments ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE session_comments ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE session_comments ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add audit + soft-delete columns to embeddings
DO $$
BEGIN
  ALTER TABLE embeddings ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE embeddings ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE embeddings ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE embeddings ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE embeddings ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add audit + soft-delete columns to chat_logs
DO $$
BEGIN
  ALTER TABLE chat_logs ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE chat_logs ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE chat_logs ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE chat_logs ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE chat_logs ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============== CHAT LOGS ==============
CREATE TABLE IF NOT EXISTS chat_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_child ON chat_logs(user_id, child_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);

-- ============== INDEXES FOR ADDED COLUMNS (after columns exist via CREATE or ALTER)
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_id ON sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============== AUDIT LOGS (compliance: who did what, when) ==============
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action     VARCHAR(100) NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details    JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_children_deleted_at ON children(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_embeddings_deleted_at ON embeddings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_session_comments_deleted_at ON session_comments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_chat_logs_deleted_at ON chat_logs(deleted_at);

-- ============== UPDATED_AT TRIGGER ==============
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS children_updated_at ON children;
CREATE TRIGGER children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ============== PRODUCTION CHILD & CLINICAL SCHEMA ==============
-- Core identity & clinical profile (children)
DO $$ BEGIN ALTER TABLE children ADD COLUMN child_code VARCHAR(50) UNIQUE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN gender VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN profile_photo TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN diagnosis_type VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN autism_level VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN diagnosis_date DATE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN primary_language VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN communication_type VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Clinical information
DO $$ BEGIN ALTER TABLE children ADD COLUMN iq_level VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN developmental_age VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN sensory_sensitivity TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN behavioral_notes TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN medical_conditions TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN medications TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN allergies TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Therapy information
DO $$ BEGIN ALTER TABLE children ADD COLUMN therapy_start_date DATE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN therapy_status VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN assigned_therapist_id UUID REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN therapy_center_id UUID; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN therapy_plan_id UUID; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN sessions_per_week INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Learning & skill profile (current/latest scores)
DO $$ BEGIN ALTER TABLE children ADD COLUMN communication_score INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN social_score INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN behavioral_score INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN cognitive_score INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN motor_skill_score INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- AI & analytics
DO $$ BEGIN ALTER TABLE children ADD COLUMN rag_profile_summary TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN last_ai_analysis_date TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE children ADD COLUMN embedding_vector_id VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- Status
DO $$ BEGIN ALTER TABLE children ADD COLUMN status VARCHAR(20) DEFAULT 'active'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_children_child_code ON children(child_code);
CREATE INDEX IF NOT EXISTS idx_children_assigned_therapist ON children(assigned_therapist_id);
CREATE INDEX IF NOT EXISTS idx_children_therapy_status ON children(therapy_status);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);

-- ============== GUARDIANS ==============
CREATE TABLE IF NOT EXISTS guardians (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name    VARCHAR(255) NOT NULL,
  phone        VARCHAR(50),
  email        VARCHAR(255),
  relationship VARCHAR(50),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guardians_email ON guardians(email);

-- ============== CHILD_GUARDIANS (junction: child <-> guardians) ==============
CREATE TABLE IF NOT EXISTS child_guardians (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_child_guardians_child ON child_guardians(child_id);
CREATE INDEX IF NOT EXISTS idx_child_guardians_guardian ON child_guardians(guardian_id);

-- ============== THERAPY CENTERS & PLANS (lookup for children) ==============
CREATE TABLE IF NOT EXISTS therapy_centers (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS therapy_plans (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seed default options (idempotent: use fixed UUIDs so re-run doesn't duplicate)
INSERT INTO therapy_centers (id, name) VALUES
  ('a0000001-0001-4000-8000-000000000001', 'Main Center'),
  ('a0000001-0001-4000-8000-000000000002', 'North Branch'),
  ('a0000001-0001-4000-8000-000000000003', 'South Branch')
ON CONFLICT (id) DO NOTHING;
INSERT INTO therapy_plans (id, name) VALUES
  ('b0000001-0001-4000-8000-000000000001', 'Standard Plan'),
  ('b0000001-0001-4000-8000-000000000002', 'Intensive Plan'),
  ('b0000001-0001-4000-8000-000000000003', 'Early Intervention')
ON CONFLICT (id) DO NOTHING;

-- ============== CHILD THERAPISTS (multiple therapists per child) ==============
CREATE TABLE IF NOT EXISTS child_therapists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, therapist_id)
);
CREATE INDEX IF NOT EXISTS idx_child_therapists_child ON child_therapists(child_id);
CREATE INDEX IF NOT EXISTS idx_child_therapists_therapist ON child_therapists(therapist_id);

-- ============== SESSION FIELDS FOR RAG (therapy session notes) ==============
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN goals_worked_on TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN activities_performed TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN child_response TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN improvements TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN behavioral_issues TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN mood_rating INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sessions ADD COLUMN engagement_score INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============== CHILD PROGRESS LOGS (skill scores over time for analytics) ==============
CREATE TABLE IF NOT EXISTS child_progress_logs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id             UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  logged_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  communication_score  INTEGER,
  social_score         INTEGER,
  behavioral_score    INTEGER,
  cognitive_score     INTEGER,
  motor_skill_score   INTEGER,
  notes               TEXT,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_child_progress_logs_child ON child_progress_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_child_progress_logs_logged_at ON child_progress_logs(logged_at);

DROP TRIGGER IF EXISTS guardians_updated_at ON guardians;
CREATE TRIGGER guardians_updated_at BEFORE UPDATE ON guardians
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS child_progress_logs_updated_at ON child_progress_logs;
CREATE TRIGGER child_progress_logs_updated_at BEFORE UPDATE ON child_progress_logs
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
-- Ensure chat_logs.child_id is nullable (production migration)
DO $$ BEGIN ALTER TABLE chat_logs ALTER COLUMN child_id DROP NOT NULL; EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============== APPOINTMENTS ==============
CREATE TABLE IF NOT EXISTS appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  therapist_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_date  DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  status            VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')) DEFAULT 'pending',
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_child_id ON appointments(child_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ============== CLINIC SLOTS (Admin-defined available windows) ==============
-- Each row is a 45-minute slot (or custom window) that is either available or blocked.
-- slot_type: 'available' means bookable; 'blocked' means a break/unavailable window.
CREATE TABLE IF NOT EXISTS clinic_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label       VARCHAR(100)  NOT NULL,           -- e.g. "09:00 AM - 09:45 AM" or "Lunch Break"
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  slot_type   VARCHAR(20) NOT NULL CHECK (slot_type IN ('available', 'blocked')) DEFAULT 'available',
  day_of_week SMALLINT[],                       -- NULL = every day; 0=Sun,1=Mon,...,6=Sat
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS clinic_slots_updated_at ON clinic_slots;
CREATE TRIGGER clinic_slots_updated_at BEFORE UPDATE ON clinic_slots
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Seed default 45-minute slots (9:00 AM – 3:00 PM) if none exist
INSERT INTO clinic_slots (label, start_time, end_time, slot_type)
SELECT label, start_time::TIME, end_time::TIME, 'available'
FROM (VALUES
  ('09:00 AM - 09:45 AM', '09:00', '09:45'),
  ('09:45 AM - 10:30 AM', '09:45', '10:30'),
  ('10:30 AM - 11:15 AM', '10:30', '11:15'),
  ('11:15 AM - 12:00 PM', '11:15', '12:00'),
  ('12:00 PM - 12:45 PM', '12:00', '12:45'),
  ('12:45 PM - 01:30 PM', '12:45', '13:30'),
  ('01:30 PM - 02:15 PM', '13:30', '14:15'),
  ('02:15 PM - 03:00 PM', '14:15', '15:00')
) AS t(label, start_time, end_time)
WHERE NOT EXISTS (SELECT 1 FROM clinic_slots LIMIT 1);

-- Migration: therapy_embeddings vector 384 -> 768 (Gemini). Clears stale vectors if resize fails.
DROP INDEX IF EXISTS idx_therapy_embeddings_vector;
DO $$
BEGIN
  ALTER TABLE therapy_embeddings ALTER COLUMN embedding TYPE vector(768);
EXCEPTION
  WHEN OTHERS THEN
    TRUNCATE therapy_embeddings;
    ALTER TABLE therapy_embeddings ALTER COLUMN embedding TYPE vector(768);
END $$;
CREATE INDEX IF NOT EXISTS idx_therapy_embeddings_vector ON therapy_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- ============== CHILD ASSESSMENTS & SCREENING ==============
CREATE TABLE IF NOT EXISTS child_assessments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id         UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  assessment_type  VARCHAR(64) NOT NULL,
  assessed_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  assessor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  respondent       VARCHAR(64),
  responses        JSONB NOT NULL DEFAULT '{}',
  scores           JSONB NOT NULL DEFAULT '{}',
  interpretation   TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_assessments_child_id ON child_assessments(child_id);
CREATE INDEX IF NOT EXISTS idx_child_assessments_type ON child_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_child_assessments_assessed_at ON child_assessments(assessed_at DESC);

DROP TRIGGER IF EXISTS child_assessments_updated_at ON child_assessments;
CREATE TRIGGER child_assessments_updated_at BEFORE UPDATE ON child_assessments
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ============== THERAPY RESOURCE LIBRARY ==============
CREATE TABLE IF NOT EXISTS therapy_resources (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  category     VARCHAR(50) NOT NULL CHECK (category IN ('pdf', 'worksheet', 'visual_schedule', 'flashcard', 'social_story')),
  file_url     TEXT,
  file_name    VARCHAR(500),
  mime_type    VARCHAR(128),
  content      TEXT,
  tags         TEXT[],
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_resources_category ON therapy_resources(category);
CREATE INDEX IF NOT EXISTS idx_therapy_resources_created_at ON therapy_resources(created_at DESC);

CREATE TABLE IF NOT EXISTS child_resource_assignments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id     UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  resource_id  UUID NOT NULL REFERENCES therapy_resources(id) ON DELETE CASCADE,
  assigned_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  notes        TEXT,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_child_resource_assignments_child ON child_resource_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_child_resource_assignments_resource ON child_resource_assignments(resource_id);

DROP TRIGGER IF EXISTS therapy_resources_updated_at ON therapy_resources;
CREATE TRIGGER therapy_resources_updated_at BEFORE UPDATE ON therapy_resources
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ============== BILLING & INVOICING ==============
CREATE TABLE IF NOT EXISTS therapy_packages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(200) NOT NULL,
  description    TEXT,
  session_count  INTEGER NOT NULL CHECK (session_count > 0),
  price_cents    INTEGER NOT NULL CHECK (price_cents >= 0),
  currency       VARCHAR(3) NOT NULL DEFAULT 'AED',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  interval_months   INTEGER NOT NULL DEFAULT 1 CHECK (interval_months > 0),
  price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
  sessions_included INTEGER,
  currency          VARCHAR(3) NOT NULL DEFAULT 'AED',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_packages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  package_id          UUID NOT NULL REFERENCES therapy_packages(id) ON DELETE RESTRICT,
  sessions_total      INTEGER NOT NULL,
  sessions_remaining  INTEGER NOT NULL,
  amount_cents        INTEGER NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'AED',
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  purchased_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          DATE,
  assigned_by         UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS child_subscriptions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id           UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  plan_id            UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  amount_cents       INTEGER NOT NULL,
  currency           VARCHAR(3) NOT NULL DEFAULT 'AED',
  status             VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_billing_date  DATE,
  assigned_by        UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  invoice_number  VARCHAR(32) NOT NULL UNIQUE,
  title           VARCHAR(500) NOT NULL,
  invoice_type    VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (invoice_type IN ('session', 'package', 'subscription', 'manual')),
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'AED',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,
  package_id      UUID REFERENCES therapy_packages(id) ON DELETE SET NULL,
  plan_id         UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_cents    INTEGER NOT NULL,
  payment_method  VARCHAR(64) DEFAULT 'manual',
  reference       VARCHAR(200),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_child_id ON invoices(child_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_session_id ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_child_packages_child ON child_packages(child_id);
CREATE INDEX IF NOT EXISTS idx_child_subscriptions_child ON child_subscriptions(child_id);

DROP TRIGGER IF EXISTS therapy_packages_updated_at ON therapy_packages;
CREATE TRIGGER therapy_packages_updated_at BEFORE UPDATE ON therapy_packages
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ============== PARENT SESSION RATING (feeds therapist analytics "parent feedback") ==============
-- Parents may optionally rate a session 1-5 alongside their comment; therapists/admins never set this.
DO $$
BEGIN
  ALTER TABLE session_comments ADD COLUMN rating SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============== CUSTOM ASSESSMENT TEMPLATES (admin/therapist-authored, alongside the 4 standard ones) ==============
CREATE TABLE IF NOT EXISTS custom_assessment_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  questions    JSONB NOT NULL DEFAULT '[]', -- [{ id, text, type: 'single_choice'|'multiple_choice'|'scale'|'text', options?, scaleMax? }]
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_assessment_templates_active ON custom_assessment_templates(is_active);

DROP TRIGGER IF EXISTS custom_assessment_templates_updated_at ON custom_assessment_templates;
CREATE TRIGGER custom_assessment_templates_updated_at BEFORE UPDATE ON custom_assessment_templates
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Links a completed assessment back to the custom template it used (NULL for the 4 built-in types).
DO $$
BEGIN
  ALTER TABLE child_assessments ADD COLUMN custom_template_id UUID REFERENCES custom_assessment_templates(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_child_assessments_custom_template ON child_assessments(custom_template_id);

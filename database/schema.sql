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
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN title VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============== CHILDREN ==============
CREATE TABLE IF NOT EXISTS children (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
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

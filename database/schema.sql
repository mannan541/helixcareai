-- HelixCareAI Autism Therapy Platform - PostgreSQL schema with pgvector
-- Run with: psql -h localhost -U postgres -d helixcareai -f schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============== USERS ==============
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'therapist', 'parent')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============== CHILDREN ==============
CREATE TABLE children (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name  VARCHAR(255) NOT NULL,
  last_name   VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_children_user_id ON children(user_id);

-- ============== SESSIONS ==============
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_date      DATE NOT NULL,
  duration_minutes  INTEGER,
  notes_text        TEXT,
  structured_metrics JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_child_id ON sessions(child_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_sessions_session_date ON sessions(session_date);
CREATE INDEX idx_sessions_structured_metrics ON sessions USING GIN (structured_metrics);

-- ============== EMBEDDINGS (pgvector for RAG) ==============
CREATE TABLE embeddings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_child_id ON embeddings(child_id);
CREATE INDEX idx_embeddings_session_id ON embeddings(session_id);
-- Cosine distance for similarity search (<=> operator)
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============== CHAT LOGS ==============
CREATE TABLE chat_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_logs_user_child ON chat_logs(user_id, child_id);
CREATE INDEX idx_chat_logs_created_at ON chat_logs(created_at);

-- ============== UPDATED_AT TRIGGER ==============
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

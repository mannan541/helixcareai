import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
const devLocal = path.resolve(process.cwd(), '.env.development.local');
if (fs.existsSync(devLocal)) {
  dotenv.config({ path: devLocal, override: true });
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  // POSTGRES_URL from Vercel Postgres / Marketplace integrations; DATABASE_URL for local or custom
  DATABASE_URL:
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/helixcareai',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION ?? '1536', 10),
  /** Local embedding service (Python FastAPI + sentence-transformers). */
  EMBEDDING_SERVICE_URL: process.env.EMBEDDING_SERVICE_URL ?? 'http://localhost:8000',
  /** Local Ollama API for RAG LLM. */
  OLLAMA_URL: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? 'llama3',
} as const;

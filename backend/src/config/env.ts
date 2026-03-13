import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Base .env (all environments)
dotenv.config();
// Local overrides (never commit real secrets; .env.development.local is gitignored)
const devLocal = path.resolve(process.cwd(), '.env.development.local');
if (fs.existsSync(devLocal)) {
  dotenv.config({ path: devLocal, override: true });
}
// Production on Vercel: no .env file; all vars from Vercel Environment Variables (Production).

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
  /** Embedding dimension: 768 for Gemini text-embedding-004. */
  EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION ?? '768', 10),
  /** Groq Cloud API for RAG LLM (primary). Get key: https://console.groq.com */
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
  GROQ_MODEL: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
  /** Google Gemini API for RAG LLM and Embeddings. Get key: https://aistudio.google.com/apikey */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL ?? 'models/embedding-001',
} as const;

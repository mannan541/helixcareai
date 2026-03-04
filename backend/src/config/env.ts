import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/helixcareai',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION ?? '1536', 10),
} as const;

#!/usr/bin/env node
/**
 * Apply database/schema.sql using DATABASE_URL or POSTGRES_URL from backend/.env.
 * Usage: from repo root: node backend/scripts/run-schema.js
 *    or from backend: node scripts/run-schema.js
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing POSTGRES_URL or DATABASE_URL in backend/.env');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('Schema file not found:', schemaPath);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Schema error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

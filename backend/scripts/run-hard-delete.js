#!/usr/bin/env node
/**
 * Hard-delete records that were soft-deleted more than 7 days ago.
 * Run periodically (e.g. daily cron). Uses DATABASE_URL or POSTGRES_URL from backend/.env.
 * Usage: from repo root: node backend/scripts/run-hard-delete.js
 *    or from backend: npm run db:hard-delete
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

const sqlPath = path.join(__dirname, '..', '..', 'database', 'hard-delete-job.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Hard-delete script not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const res = await client.query(sql);
    console.log('Hard-delete job completed (removed records soft-deleted > 7 days ago).');
  } catch (err) {
    console.error('Hard-delete error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

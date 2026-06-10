#!/usr/bin/env tsx
/**
 * Apply full AI reindex for every child with sessions.
 * Usage (from backend): npm run db:reindex
 * Requires DATABASE_URL/POSTGRES_URL and GEMINI_API_KEY in .env
 */
import * as therapyEmbeddingStorage from '../src/modules/ai/therapyEmbeddingStorage';

async function main() {
  console.log('Reindexing all session data for AI…');
  const result = await therapyEmbeddingStorage.reindexAllChildren();
  console.log('Done.');
  console.log(`  Children: ${result.children}`);
  console.log(`  Indexed:  ${result.indexed}`);
  console.log(`  Skipped:  ${result.skipped} (empty session data)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Reindex failed:', err);
  process.exit(1);
});

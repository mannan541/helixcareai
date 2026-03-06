-- Hard-delete records that were soft-deleted more than 7 days ago.
-- Run periodically (e.g. daily cron): psql $DATABASE_URL -f database/hard-delete-job.sql
-- Or from backend: npm run db:hard-delete

-- Delete in order: dependents first (so FKs are satisfied), then parents.
-- CASCADE will remove session_comments and embeddings when their session is deleted.

-- 1) Soft-deleted embeddings > 7 days ago
DELETE FROM embeddings
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days';

-- 2) Soft-deleted session_comments > 7 days ago
DELETE FROM session_comments
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days';

-- 3) Soft-deleted sessions > 7 days ago (CASCADE deletes their comments & embeddings)
DELETE FROM sessions
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days';

-- 4) Soft-deleted children > 7 days ago
DELETE FROM children
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days';

-- 5) Soft-deleted chat_logs > 7 days ago
DELETE FROM chat_logs
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days';

-- 6) Soft-deleted users > 7 days ago
DELETE FROM users
WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '7 days';

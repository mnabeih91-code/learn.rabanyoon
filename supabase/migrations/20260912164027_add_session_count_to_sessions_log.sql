-- Add session_count column to sessions_log table
-- 30-minute sessions = 1 session, 60-minute sessions = 2 sessions (double)
ALTER TABLE sessions_log ADD COLUMN IF NOT EXISTS session_count integer DEFAULT 1;

-- Backfill existing rows with default value of 1
UPDATE sessions_log SET session_count = 1 WHERE session_count IS NULL;

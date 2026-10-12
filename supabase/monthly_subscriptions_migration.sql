-- =====================================================================
-- Monthly Subscription History System — Database Migration
-- =====================================================================
-- This migration creates the monthly_subscriptions table and adds
-- subscription_start_date / is_deleted columns to students.
-- It MUST be applied via the Supabase MCP apply_migration tool.
-- It is idempotent: safe to re-run (uses IF NOT EXISTS and ON CONFLICT).
-- =====================================================================

-- 1. Add columns to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS subscription_start_date date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- 2. Create monthly_subscriptions table
CREATE TABLE IF NOT EXISTS monthly_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  billing_year integer NOT NULL,
  billing_month integer NOT NULL CHECK (billing_month >= 0 AND billing_month <= 11),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint to prevent duplicate monthly records (idempotency guarantee)
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_subs_unique
  ON monthly_subscriptions (student_id, billing_year, billing_month);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_monthly_subs_student ON monthly_subscriptions (student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_subs_period ON monthly_subscriptions (billing_year, billing_month);

-- 3. Enable RLS
ALTER TABLE monthly_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_monthly_subs" ON monthly_subscriptions;
CREATE POLICY "anon_select_monthly_subs" ON monthly_subscriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_monthly_subs" ON monthly_subscriptions;
CREATE POLICY "anon_insert_monthly_subs" ON monthly_subscriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_monthly_subs" ON monthly_subscriptions;
CREATE POLICY "anon_update_monthly_subs" ON monthly_subscriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_monthly_subs" ON monthly_subscriptions;
CREATE POLICY "anon_delete_monthly_subs" ON monthly_subscriptions FOR DELETE
  TO anon, authenticated USING (true);

-- 4. Backfill subscription_start_date for existing students
UPDATE students
SET subscription_start_date = (created_at AT TIME ZONE 'UTC')::date
WHERE subscription_start_date IS NULL;

-- 5. Create initial monthly subscription records for existing students
-- Uses ON CONFLICT for idempotency (safe to re-run)
INSERT INTO monthly_subscriptions (student_id, billing_year, billing_month, amount, status, payment_date)
SELECT
  s.id,
  EXTRACT(YEAR FROM now())::int,
  EXTRACT(MONTH FROM now())::int - 1,
  s.monthly_fee,
  s.subscription_status,
  CASE WHEN s.subscription_status = 'paid' THEN now() ELSE NULL END
FROM students s
WHERE s.is_paused = false AND s.is_deleted = false
ON CONFLICT (student_id, billing_year, billing_month) DO NOTHING;

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION update_monthly_subs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monthly_subs_updated_at ON monthly_subscriptions;
CREATE TRIGGER trg_monthly_subs_updated_at
  BEFORE UPDATE ON monthly_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_subs_updated_at();

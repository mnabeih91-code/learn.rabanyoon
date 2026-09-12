/*
# Phase Updates: Teacher Archive, Student Paused Status, Session-Based Architecture, Stripe Payment Tracking

## Summary
This migration supports 12 critical functional updates to transition the academy management system from beta to production.

## Changes

### 1. Teachers Table — Archive/Deactivate Support
- Added `is_active` (boolean, default true) column to teachers table.
- Allows admin to archive/deactivate teachers instead of permanent deletion.
- Archived teachers are excluded from booking page and active lists but retained for historical data.

### 2. Students Table — Paused Status Support
- Added `is_paused` (boolean, default false) column to students table.
- Paused students are automatically excluded from the financial ledger for that period.
- The `subscription_status` text column already supports 'paid', 'pending', 'overdue' values.

### 3. Sessions Log Table — Session-Based Architecture
- Added `session_number` (integer) column to sessions_log table.
- This enables multiple sessions per day to be treated as separate entries with unique session numbers.
- Each session is counted independently for financial (salary) and academic (attendance) calculations.

### 4. Financials Table — Stripe Payment Tracking
- Added `stripe_payment_intent_id` (text, nullable) column to financials table.
- Added `stripe_checkout_session_id` (text, nullable) column to financials table.
- Added `admin_confirmed` (boolean, default false) column to financials table.
- Payment status only changes to 'paid' when admin confirms the transaction after Stripe notification.

### 5. Students Table — Subscription End Date for Auto-billing
- The existing `expiry_date` column is used for auto-billing logic.
- When expiry approaches, the system auto-creates a 'pending' invoice for the next month.

## Security
- All existing RLS policies remain intact.
- New columns inherit existing table-level RLS policies.
- No new tables created, so no new RLS policies needed.

## Important Notes
1. All new columns have safe defaults so existing rows are not affected.
2. The `is_active` column defaults to true so all existing teachers remain active.
3. The `is_paused` column defaults to false so all existing students remain active.
4. The `admin_confirmed` column defaults to false so existing financial records require admin confirmation.
5. The `session_number` column is nullable so existing session logs are not affected.
*/

-- 1. Add is_active column to teachers (for archive/deactivate)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'is_active') THEN
    ALTER TABLE teachers ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 2. Add is_paused column to students (for paused status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'is_paused') THEN
    ALTER TABLE students ADD COLUMN is_paused boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Add session_number column to sessions_log (for session-based architecture)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions_log' AND column_name = 'session_number') THEN
    ALTER TABLE sessions_log ADD COLUMN session_number integer;
  END IF;
END $$;

-- 4. Add Stripe payment tracking columns to financials
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'stripe_payment_intent_id') THEN
    ALTER TABLE financials ADD COLUMN stripe_payment_intent_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'stripe_checkout_session_id') THEN
    ALTER TABLE financials ADD COLUMN stripe_checkout_session_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'admin_confirmed') THEN
    ALTER TABLE financials ADD COLUMN admin_confirmed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 5. Add index on teachers.is_active for faster filtering
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON teachers (is_active);

-- 6. Add index on students.is_paused for faster filtering
CREATE INDEX IF NOT EXISTS idx_students_is_paused ON students (is_paused);

-- 7. Add index on sessions_log.session_number for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_log_session_number ON sessions_log (session_number);

-- 8. Add index on financials.admin_confirmed for faster queries
CREATE INDEX IF NOT EXISTS idx_financials_admin_confirmed ON financials (admin_confirmed);

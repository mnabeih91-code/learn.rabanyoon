/*
# Create Academy Management Schema (Single-tenant, No Auth)

## Overview
Creates the complete database schema for "أكاديمية ربانيون" — an academy management system
with teachers, students, session logs, financials, and a public booking flow.
This is a single-tenant app with no sign-in screen; the frontend uses the anon key
for all operations, so all policies use `TO anon, authenticated`.

## New Tables

### 1. `teachers`
- `id` (uuid, primary key, auto-generated)
- `name` (text, not null) — teacher's full name
- `phone` (text) — contact phone
- `email` (text) — contact email
- `subject` (text) — primary subject (e.g. "القرآن الكريم")
- `salary_per_session` (numeric, default 0) — payment per completed session
- `availability_slots` (jsonb, default '[]') — weekly 30-minute slot configurations
  Format: [{ day: "saturday", start: "16:00", end: "16:30", status: "available"|"booked"|"closed", student_id: null|uuid, student_name: null|text }]
- `created_at` (timestamptz, default now())

### 2. `students`
- `id` (uuid, primary key, auto-generated)
- `name` (text, not null) — student's full name
- `phone` (text) — student/parent contact phone
- `teacher_id` (uuid, references teachers) — assigned teacher
- `regular_slots` (jsonb, default '[]') — recurring booked slots (same format as availability)
- `total_sessions` (integer, default 0) — count of completed sessions
- `subscription_status` (text, default 'pending') — 'paid' | 'pending' | 'overdue'
- `status` (text, default 'طالب جديد') — student lifecycle status
- `expiry_date` (date) — subscription expiry date
- `monthly_fee` (numeric, default 0) — monthly subscription fee
- `created_at` (timestamptz, default now())

### 3. `sessions_log`
- `id` (uuid, primary key, auto-generated)
- `student_id` (uuid, references students) — the student who attended
- `teacher_id` (uuid, references teachers) — the teacher who logged the session
- `date` (timestamptz, default now()) — session date/time
- `attendance_status` (text, not null) — 'حاضر' | 'غائب بعذر' | 'غائب بدون عذر'
- `type` (text) — 'قرآن' | 'علوم شرعية' — session category
- `subject_name` (text) — specific subject name
- `material_covered` (text) — material covered in session
- `hifz_score` (integer) — memorization score (0-10), null if absent
- `tajweed_score` (integer) — tajweed score (0-10), null if absent
- `review_score` (integer) — review score (0-10), null if absent
- `interaction_old` (integer) — interaction with previous material (0-10)
- `interaction_new` (integer) — interaction with new material (0-10)
- `behavior_score` (integer) — behavior score (0-10), null if absent
- `student_alerts` (text) — alerts/notes for the student
- `notes` (text) — general teacher notes
- `duration_minutes` (integer, default 30) — session duration
- `updated_at` (timestamptz, default now()) — last edit timestamp

### 4. `financials`
- `id` (uuid, primary key, auto-generated)
- `student_id` (uuid, references students) — linked student
- `amount` (numeric, not null) — invoice amount
- `status` (text, default 'pending') — 'paid' | 'pending' | 'overdue'
- `updated_at` (timestamptz, default now()) — last update timestamp
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in screen — all data is intentionally
  shared and accessible via the anon key.

## Important Notes
1. All tables use `gen_random_uuid()` for ID generation.
2. Foreign keys cascade on delete for data integrity.
3. The `availability_slots` jsonb on teachers stores the weekly grid state
   (available/booked/closed) which the teacher and booking page read/write.
4. The `updated_at` on sessions_log is set via trigger to track evaluation edits.
*/

-- Enable uuid extension if not already
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ TEACHERS ============
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  subject text DEFAULT '',
  salary_per_session numeric DEFAULT 0,
  availability_slots jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teachers" ON teachers;
CREATE POLICY "anon_select_teachers" ON teachers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teachers" ON teachers;
CREATE POLICY "anon_insert_teachers" ON teachers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teachers" ON teachers;
CREATE POLICY "anon_update_teachers" ON teachers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teachers" ON teachers;
CREATE POLICY "anon_delete_teachers" ON teachers FOR DELETE
  TO anon, authenticated USING (true);

-- ============ STUDENTS ============
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  regular_slots jsonb DEFAULT '[]'::jsonb,
  total_sessions integer DEFAULT 0,
  subscription_status text DEFAULT 'pending',
  status text DEFAULT 'طالب جديد',
  expiry_date date,
  monthly_fee numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE
  TO anon, authenticated USING (true);

-- ============ SESSIONS_LOG ============
CREATE TABLE IF NOT EXISTS sessions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  date timestamptz DEFAULT now(),
  attendance_status text NOT NULL DEFAULT 'حاضر',
  type text DEFAULT 'قرآن',
  subject_name text DEFAULT '',
  material_covered text DEFAULT '',
  hifz_score integer,
  tajweed_score integer,
  review_score integer,
  interaction_old integer,
  interaction_new integer,
  behavior_score integer,
  student_alerts text DEFAULT '',
  notes text DEFAULT '',
  duration_minutes integer DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions_log;
CREATE POLICY "anon_select_sessions" ON sessions_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions_log;
CREATE POLICY "anon_insert_sessions" ON sessions_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions_log;
CREATE POLICY "anon_update_sessions" ON sessions_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions_log;
CREATE POLICY "anon_delete_sessions" ON sessions_log FOR DELETE
  TO anon, authenticated USING (true);

-- ============ FINANCIALS ============
CREATE TABLE IF NOT EXISTS financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_financials" ON financials;
CREATE POLICY "anon_select_financials" ON financials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_financials" ON financials;
CREATE POLICY "anon_insert_financials" ON financials FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_financials" ON financials;
CREATE POLICY "anon_update_financials" ON financials FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_financials" ON financials;
CREATE POLICY "anon_delete_financials" ON financials FOR DELETE
  TO anon, authenticated USING (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions_log(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON sessions_log(teacher_id);
CREATE INDEX IF NOT EXISTS idx_financials_student_id ON financials(student_id);

-- ============ TRIGGER: updated_at on sessions_log ============
CREATE OR REPLACE FUNCTION update_sessions_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sessions_log_updated_at ON sessions_log;
CREATE TRIGGER trigger_sessions_log_updated_at
  BEFORE UPDATE ON sessions_log
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_log_updated_at();

-- ============ TRIGGER: updated_at on financials ============
CREATE OR REPLACE FUNCTION update_financials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_financials_updated_at ON financials;
CREATE TRIGGER trigger_financials_updated_at
  BEFORE UPDATE ON financials
  FOR EACH ROW
  EXECUTE FUNCTION update_financials_updated_at();

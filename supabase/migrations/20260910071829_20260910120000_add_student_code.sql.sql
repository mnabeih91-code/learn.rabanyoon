/*
# Add student_code column to students table

1. New Columns
- `students.student_code` (text, unique, nullable) — a short manual code the admin assigns
  to each student so parents/clients can look up the student on the public payment page.
  The code is optional (older rows may have NULL) but, when set, must be unique.

2. Indexes
- Unique index on `students.student_code` to enforce uniqueness and speed up lookups.

3. Security
- No RLS policy changes. The existing `anon, authenticated` CRUD policies on
  `students` already cover the new column — the anon-key client can read and write it.
  The public payment page reads by `student_code` via the same SELECT policy.

4. Important Notes
- The column is nullable so existing rows are not affected.
- The admin is the only role that sets/changes this code in the UI. Students and
  teachers never see an editable field for it.
*/

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS student_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_code
  ON students (student_code)
  WHERE student_code IS NOT NULL;

/*
# Attendance Status Rename + New Status

## Changes
1. Renames the legacy `غائب بعذر` attendance value to `اعتذار المعلم` in all existing session_log rows.
2. The CHECK constraint on sessions_log.attendance_status (if any) already allows arbitrary text — no constraint change needed.

## Motivation
- The old label was ambiguous. The new label clarifies WHO is excusing: the teacher.
- A new status `اعتذار الطالب بعذر` is introduced for student-initiated excused absences.
  No DDL change is needed; the column stores free-form text.

## Data Safety
- Only UPDATE — no rows deleted.
- Idempotent: running twice will update 0 rows the second time.
*/

UPDATE sessions_log
SET attendance_status = 'اعتذار المعلم'
WHERE attendance_status = 'غائب بعذر';

/*
# Academy Upgrade: Packages, Settings, Payroll, Auth Fields
*/

-- ============ PACKAGES ============
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_count integer NOT NULL,
  label text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 30,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_packages" ON packages;
CREATE POLICY "anon_select_packages" ON packages FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_packages" ON packages;
CREATE POLICY "anon_insert_packages" ON packages FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_packages" ON packages;
CREATE POLICY "anon_update_packages" ON packages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_packages" ON packages;
CREATE POLICY "anon_delete_packages" ON packages FOR DELETE
  TO anon, authenticated USING (true);

-- ============ ACADEMY_SETTINGS (single-row) ============
CREATE TABLE IF NOT EXISTS academy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text DEFAULT '',
  academy_name text DEFAULT 'أكاديمية ربانيون',
  booking_url text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE academy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON academy_settings;
CREATE POLICY "anon_select_settings" ON academy_settings FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON academy_settings;
CREATE POLICY "anon_insert_settings" ON academy_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON academy_settings;
CREATE POLICY "anon_update_settings" ON academy_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ PAYROLL ============
CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  bonuses numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, month, year)
);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payroll" ON payroll;
CREATE POLICY "anon_select_payroll" ON payroll FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payroll" ON payroll;
CREATE POLICY "anon_insert_payroll" ON payroll FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payroll" ON payroll;
CREATE POLICY "anon_update_payroll" ON payroll FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payroll" ON payroll;
CREATE POLICY "anon_delete_payroll" ON payroll FOR DELETE
  TO anon, authenticated USING (true);

-- ============ AUTH FIELDS ON TEACHERS ============
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password text DEFAULT '';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS role text DEFAULT 'teacher';

-- ============ AUTH FIELDS ON STUDENTS ============
ALTER TABLE students ADD COLUMN IF NOT EXISTS password text DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';

-- ============ TRIGGER: updated_at on payroll ============
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payroll_updated_at ON payroll;
CREATE TRIGGER trigger_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_updated_at();

-- ============ TRIGGER: updated_at on academy_settings ============
CREATE OR REPLACE FUNCTION update_academy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_academy_settings_updated_at ON academy_settings;
CREATE TRIGGER trigger_academy_settings_updated_at
  BEFORE UPDATE ON academy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_academy_settings_updated_at();

-- ============ SEED PACKAGES ============
INSERT INTO packages (session_count, label, description, price, duration_minutes, is_active, sort_order)
VALUES
  (1, 'حصة واحدة', 'حصة واحدة أسبوعياً', 200, 30, true, 1),
  (2, 'حصتان', 'حصتان أسبوعياً', 400, 30, true, 2),
  (3, '3 حصص', 'ثلاث حصص أسبوعياً', 600, 30, true, 3)
ON CONFLICT DO NOTHING;

-- ============ SEED ACADEMY_SETTINGS ============
INSERT INTO academy_settings (whatsapp_number, academy_name, booking_url)
VALUES ('201012345678', 'أكاديمية ربانيون', '')
ON CONFLICT DO NOTHING;

-- ============ SEED DEFAULT PASSWORDS FOR EXISTING TEACHERS ============
UPDATE teachers SET password = '123456' WHERE password = '' OR password IS NULL;
UPDATE students SET password = '123456' WHERE password = '' OR password IS NULL;

/*
# Add page_config JSONB column to academy_settings

1. New Columns
- `academy_settings.page_config` (jsonb, default '{}'::jsonb) — stores the admin's
  customisation for both external pages (booking + payment). The structure mirrors
  the PageConfig TypeScript type and contains:
    - booking: { title, subtitle, successTitle, successMessage, bannerTitle,
        bannerText, showBanner, customFields: CustomField[], enabledFields: {name,phone,teacher} }
    - payment: { title, subtitle, successMessage, bannerTitle, bannerText, showBanner,
        enableCustomAmount, enableAltPackages, enableCurrentPackage,
        customFields: CustomField[] }

2. Security
- No RLS policy changes. The existing anon/authenticated CRUD policies on
  academy_settings already cover the new column.

3. Important Notes
- The column is nullable-safe with a default of '{}', so existing rows and any
  code that doesn't know about page_config are unaffected.
- All frontend code reads page_config defensively, falling back to built-in defaults
  when a key is missing.
*/

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS page_config jsonb DEFAULT '{}'::jsonb;

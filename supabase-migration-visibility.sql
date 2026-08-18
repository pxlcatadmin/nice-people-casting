-- Add public/private visibility to jobs.
-- 'public'  = shown on /castings (the outward-facing dashboard)
-- 'private' = shown on /castings/private (an unlisted dashboard for internal use)
-- Existing rows default to 'public' so nothing disappears from the public page.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public', 'private'));

-- Belt and braces: make sure every existing row has a value so the
-- /castings filter (which requires visibility='public') doesn't hide anything.
UPDATE jobs SET visibility = 'public' WHERE visibility IS NULL;

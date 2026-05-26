-- Add a "Previous work" text field on submissions for applicant portfolio links
-- Stored as plain TEXT so applicants can paste one URL or many (one per line)

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS previous_work TEXT DEFAULT '';

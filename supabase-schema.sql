-- Nice People Casting Platform - Database Schema
-- Run this in your Supabase SQL Editor

-- Jobs table (each casting callout)
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  shoot_date DATE,
  asset_config JSONB DEFAULT '{"digis":{"enabled":true,"required":true,"min":4,"max":8},"portfolio":{"enabled":true,"required":false,"max":10},"self_tape":{"enabled":false,"required":false},"measurements":{"enabled":true,"fields":{"height_cm":true,"bust_cm":true,"waist_cm":true,"hips_cm":true,"shoe_size":true,"hair_color":true,"eye_color":true}},"about":{"fields":{"phone":true,"instagram":true,"date_of_birth":true,"gender":true}},"experience":{"enabled":true}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submissions table (talent applications)
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  date_of_birth DATE,
  gender TEXT DEFAULT '',
  -- Measurements
  height_cm INTEGER,
  bust_cm INTEGER,
  waist_cm INTEGER,
  hips_cm INTEGER,
  shoe_size TEXT DEFAULT '',
  hair_color TEXT DEFAULT '',
  eye_color TEXT DEFAULT '',
  -- Experience
  experience_level TEXT DEFAULT 'none' CHECK (experience_level IN ('none', 'some', 'experienced', 'professional')),
  experience_notes TEXT DEFAULT '',
  -- Photos (stored as JSON arrays of URLs)
  digis JSONB DEFAULT '[]'::jsonb,
  portfolio JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb, -- combined digis + portfolio for quick access
  self_tape_url TEXT DEFAULT '',
  -- Admin fields
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'shortlisted', 'rejected', 'booked')),
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_submissions_job_id ON submissions(job_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_jobs_slug ON jobs(slug);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Public can read open jobs (for the submission form)
CREATE POLICY "Public can read open jobs" ON jobs
  FOR SELECT USING (status = 'open');

-- Public can insert submissions (for the submission form)
CREATE POLICY "Public can insert submissions" ON submissions
  FOR INSERT WITH CHECK (true);

-- Authenticated users (admin) can do everything
CREATE POLICY "Admin full access to jobs" ON jobs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to submissions" ON submissions
  FOR ALL USING (auth.role() = 'authenticated');

-- Storage bucket for photos
-- Run this separately or create via Supabase dashboard:
-- 1. Go to Storage
-- 2. Create a new bucket called "submissions"
-- 3. Set it to public
-- 4. Add policy: allow public uploads (INSERT) and reads (SELECT)

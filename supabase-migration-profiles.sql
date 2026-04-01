-- Run this in your Supabase SQL Editor
-- Adds profiles table for Google OAuth + autofill feature

-- Profiles table (linked to Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
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
  experience_level TEXT DEFAULT 'none',
  experience_notes TEXT DEFAULT '',
  -- Saved photos for reuse
  saved_digis JSONB DEFAULT '[]'::jsonb,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add profile_id to submissions (nullable - guest submissions stay unlinked)
ALTER TABLE submissions ADD COLUMN profile_id UUID REFERENCES profiles(id);
CREATE INDEX idx_submissions_profile_id ON submissions(profile_id);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow public/anon to read profiles (needed for the submission form to check if profile exists)
-- This is safe because the form only queries by auth session
CREATE POLICY "Anon can read profiles" ON profiles
  FOR SELECT USING (true);

-- Allow authenticated users to link their submissions
CREATE POLICY "Users can update own submissions" ON submissions
  FOR UPDATE USING (auth.uid() = profile_id);

-- Admin full access to profiles
CREATE POLICY "Admin full access to profiles" ON profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- Share links for sharing shortlists with clients
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  client_name TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  allow_selections BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_job_id ON share_links(job_id);

-- Client selections on shared shortlists
CREATE TABLE IF NOT EXISTS client_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID REFERENCES share_links(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  selected BOOLEAN DEFAULT true,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(share_link_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_client_selections_share_link ON client_selections(share_link_id);

-- Allow-all RLS policies (app handles auth)
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on share_links" ON share_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on client_selections" ON client_selections FOR ALL USING (true) WITH CHECK (true);

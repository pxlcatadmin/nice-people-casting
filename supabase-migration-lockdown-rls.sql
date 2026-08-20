-- ============================================================
-- SECURITY LOCKDOWN — row level security
-- ============================================================
--
-- WHY THIS EXISTS
--
-- The anon key is embedded in the JavaScript bundle served from
-- casting.nicepeople.au. It is public by design and must be treated as
-- known to any attacker. Before this migration, that key could read AND
-- write every table:
--
--   * 383 submissions, including tax file numbers, ABNs, bank BSB and
--     account numbers, home addresses, dates of birth, emergency
--     contacts and signed agreement PDFs
--   * every profile
--   * every share link token, allowing access to any client shortlist
--   * DELETE and PATCH were permitted, so the whole table could be
--     altered or wiped
--
-- Root cause was policies written as USING (true), e.g.
--
--   CREATE POLICY "Anon can read profiles" ON profiles
--     FOR SELECT USING (true);
--
-- A policy of USING (true) grants access to every row for everyone. It
-- does not matter what the frontend chooses to query — an attacker calls
-- the REST API directly and ignores the app entirely.
--
--
-- THE MODEL AFTER THIS MIGRATION
--
-- The browser gets almost nothing. Every read and write of application
-- data happens in a server route using the service role key, which
-- bypasses RLS and is never sent to the browser.
--
--   anon (browser)  -> no table access, except a signed-in user
--                      reading/writing their own profiles row
--   service role    -> full access, server only
--
-- REQUIRES: server code must use SUPABASE_SERVICE_ROLE_KEY. Applying
-- this SQL before deploying that code will break the app.
-- ============================================================


-- ---------- 1. Make sure RLS is actually on ----------
-- A table with RLS disabled ignores policies entirely.

ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_selections ENABLE ROW LEVEL SECURITY;

-- Force it even for the table owner, so nothing slips past.
ALTER TABLE jobs              FORCE ROW LEVEL SECURITY;
ALTER TABLE submissions       FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles          FORCE ROW LEVEL SECURITY;
ALTER TABLE share_links       FORCE ROW LEVEL SECURITY;
ALTER TABLE client_selections FORCE ROW LEVEL SECURITY;


-- ---------- 2. Remove every existing policy ----------
-- Done dynamically because policies have accumulated across several
-- migrations under names we cannot rely on.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('jobs','submissions','profiles','share_links','client_selections')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
  END LOOP;
END $$;


-- ---------- 3. Grant back only what the browser genuinely needs ----------
--
-- With no policy on a table, RLS denies everything to anon and
-- authenticated. The service role bypasses RLS, so all server routes keep
-- working. That is the desired default, so jobs, submissions, share_links
-- and client_selections deliberately get NO policies at all.
--
-- The one exception: a signed-in user managing their own profile row,
-- which the apply form does directly from the browser.

CREATE POLICY "own profile: read" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "own profile: insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "own profile: update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ---------- 4. Verify ----------
-- Expect: rls_enabled = true on all five, and policies only on profiles.

SELECT
  c.relname                AS table_name,
  c.relrowsecurity         AS rls_enabled,
  c.relforcerowsecurity    AS rls_forced,
  COALESCE(p.cnt, 0)       AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT tablename, COUNT(*) AS cnt
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relname IN ('jobs','submissions','profiles','share_links','client_selections')
ORDER BY c.relname;

import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * Uses the service role key, which BYPASSES row level security.
 *
 * NEVER import this into a client component, or anything reachable from a
 * file marked "use client". If this key reaches the browser it grants full
 * read/write on every table to anyone who views source.
 *
 * Every table denies the anon key (see supabase-migration-lockdown-rls.sql),
 * so all application reads and writes must go through this client from a
 * server route or server component.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Server-side Supabase access needs it — " +
      "the anon key no longer has table access. Add it in Vercel " +
      "(Settings > Environment Variables) and in .env.local, then redeploy."
  );
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

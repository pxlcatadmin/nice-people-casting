import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Find the share link
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("*")
    .eq("token", token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!link.is_active) {
    return NextResponse.json({ error: "revoked" }, { status: 403 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 403 });
  }

  // Get job info
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description")
    .eq("id", link.job_id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Get shortlisted submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("job_id", link.job_id)
    .eq("status", "shortlisted")
    .order("created_at", { ascending: true });

  // Get existing client selections for this link
  const { data: selections } = await supabase
    .from("client_selections")
    .select("*")
    .eq("share_link_id", link.id);

  const selectionMap = new Map(
    (selections || []).map((s) => [s.submission_id, s])
  );

  // Strip private fields, merge selection state
  const publicSubmissions = (submissions || []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    instagram: s.instagram,
    gender: s.gender,
    height_cm: s.height_cm,
    hair_color: s.hair_color,
    eye_color: s.eye_color,
    experience_level: s.experience_level,
    experience_notes: s.experience_notes,
    photos: [...(s.digis || []), ...(s.portfolio || [])],
    self_tape_url: s.self_tape_url || "",
    selected: selectionMap.get(s.id)?.selected || false,
    selection_note: selectionMap.get(s.id)?.note || "",
  }));

  return NextResponse.json({
    job: { title: job.title, description: job.description },
    submissions: publicSubmissions,
    allow_selections: link.allow_selections,
    client_name: link.client_name,
  });
}

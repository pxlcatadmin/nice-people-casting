import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate the share link
  const { data: link } = await supabase
    .from("share_links")
    .select("id, is_active, allow_selections, expires_at")
    .eq("token", token)
    .single();

  if (!link || !link.is_active) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 403 });
  }

  if (!link.allow_selections) {
    return NextResponse.json({ error: "Selections not allowed" }, { status: 403 });
  }

  const body = await request.json();
  const { submission_id, selected, note } = body;

  if (!submission_id) {
    return NextResponse.json({ error: "submission_id required" }, { status: 400 });
  }

  // Upsert selection
  const { data, error } = await supabase
    .from("client_selections")
    .upsert(
      {
        share_link_id: link.id,
        submission_id,
        selected: selected !== false,
        note: note || "",
      },
      { onConflict: "share_link_id,submission_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

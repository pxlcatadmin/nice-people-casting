import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, title, slug, description, status, type, asset_config, shoot_date, brief_url")
    .eq("slug", slug)
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(job);
}

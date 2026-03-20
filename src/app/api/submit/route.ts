import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const jobSlug = body.job_slug;

    // Find the job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("slug", jobSlug)
      .eq("status", "open")
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "This casting call is no longer accepting submissions." },
        { status: 404 }
      );
    }

    // Insert submission - photos already uploaded client-side
    const { error: insertError } = await supabase.from("submissions").insert({
      job_id: job.id,
      first_name: body.first_name || "",
      last_name: body.last_name || "",
      email: body.email || "",
      phone: body.phone || "",
      instagram: body.instagram || "",
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || "",
      height_cm: body.height_cm ? parseInt(body.height_cm) : null,
      bust_cm: body.bust_cm ? parseInt(body.bust_cm) : null,
      waist_cm: body.waist_cm ? parseInt(body.waist_cm) : null,
      hips_cm: body.hips_cm ? parseInt(body.hips_cm) : null,
      shoe_size: body.shoe_size || "",
      hair_color: body.hair_color || "",
      eye_color: body.eye_color || "",
      experience_level: body.experience_level || "none",
      experience_notes: body.experience_notes || "",
      digis: body.digis || [],
      portfolio: body.portfolio || [],
      photos: [...(body.digis || []), ...(body.portfolio || [])],
      self_tape_url: body.self_tape_url || "",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

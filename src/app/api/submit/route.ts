import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { data: submission, error: insertError } = await supabase.from("submissions").insert({
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
      profile_id: body.profile_id || null,
    }).select("id").single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    // Send email notification (non-blocking - don't fail the submission if email fails)
    try {
      const name = `${body.first_name} ${body.last_name}`.trim();
      await resend.emails.send({
        from: "Nice People Casting <onboarding@resend.dev>",
        to: "info@nicepeople.au",
        subject: `New application - ${name}`,
        html: `
          <h2>New casting application</h2>
          <p><strong>Job:</strong> ${jobSlug}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${body.email || "-"}</p>
          <p><strong>Phone:</strong> ${body.phone || "-"}</p>
          <p><strong>Instagram:</strong> ${body.instagram || "-"}</p>
          <p><strong>Gender:</strong> ${body.gender || "-"}</p>
          <p><strong>Experience:</strong> ${body.experience_level || "-"}</p>
          <p><strong>Digis:</strong> ${(body.digis || []).length} photos</p>
          <p><strong>Portfolio:</strong> ${(body.portfolio || []).length} photos</p>
          <br>
          <p><a href="https://casting.nicepeople.au/admin">View in admin</a></p>
        `,
      });
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }

    return NextResponse.json({ success: true, submission_id: submission?.id });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

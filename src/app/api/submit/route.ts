import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { EMAIL_SIGNATURE } from "@/lib/email-signature";
import { generateAgreementPdf } from "@/lib/generate-agreement-pdf";

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
      .select("id, type")
      .eq("slug", jobSlug)
      .eq("status", "open")
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "This casting call is no longer accepting submissions." },
        { status: 404 }
      );
    }

    const isRegistration = job.type === "registration";

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
      registration_data: body.registration_data || null,
    }).select("id").single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    // Send email notifications (non-blocking)
    const name = `${body.first_name} ${body.last_name}`.trim();

    // Admin notification
    try {
      await resend.emails.send({
        from: "Nice People Casting <onboarding@resend.dev>",
        to: "info@nicepeople.au",
        subject: isRegistration ? `New talent registration - ${name}` : `New application - ${name}`,
        html: `
          <h2>${isRegistration ? "New talent registration" : "New casting application"}</h2>
          <p><strong>Job:</strong> ${jobSlug}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${body.email || "-"}</p>
          <p><strong>Phone:</strong> ${body.phone || "-"}</p>
          <p><strong>Instagram:</strong> ${body.instagram || "-"}</p>
          <p><strong>Gender:</strong> ${body.gender || "-"}</p>
          <p><strong>Experience:</strong> ${body.experience_level || "-"}</p>
          <p><strong>Digis:</strong> ${(body.digis || []).length} photos</p>
          <p><strong>Portfolio:</strong> ${(body.portfolio || []).length} photos</p>
          ${isRegistration && body.registration_data ? `
            <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e5e5;">
            <p><strong>Agreement signed:</strong> ${body.registration_data.agreement_signed ? "Yes" : "No"}</p>
            <p><strong>Signature:</strong> ${body.registration_data.agreement_signature || "-"}</p>
            <p><strong>Code of conduct:</strong> ${body.registration_data.code_of_conduct_agreed ? "Agreed" : "Not agreed"}</p>
          ` : ""}
          <br>
          <p><a href="https://casting.nicepeople.au/admin">View in admin</a></p>
        `,
      });
    } catch (emailError) {
      console.error("Admin email notification failed:", emailError);
    }

    // Registration welcome email with signed agreement PDF
    if (isRegistration && body.email && body.registration_data) {
      try {
        const pdfBuffer = generateAgreementPdf({
          performerName: name,
          signedAt: body.registration_data.agreement_signed_at || new Date().toISOString(),
          signature: body.registration_data.agreement_signature || name,
        });

        // Upload PDF to Supabase storage for records
        const pdfFileName = `agreements/${jobSlug}/${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
        await supabase.storage
          .from("submissions")
          .upload(pdfFileName, pdfBuffer, { contentType: "application/pdf" });

        const { data: { publicUrl: pdfUrl } } = supabase.storage.from("submissions").getPublicUrl(pdfFileName);

        // Store PDF URL on the submission
        await supabase
          .from("submissions")
          .update({ registration_data: { ...body.registration_data, agreement_pdf_url: pdfUrl } })
          .eq("id", submission?.id);

        await resend.emails.send({
          from: "Nice People Casting <onboarding@resend.dev>",
          to: body.email,
          subject: "Welcome to Nice People",
          attachments: [
            {
              filename: `Nice People - Talent Agreement - ${name}.pdf`,
              content: pdfBuffer.toString("base64"),
            },
          ],
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <p style="font-size: 16px; color: #333;">Hey ${body.first_name || "there"},</p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Welcome to Nice People - we're really excited to have you on board.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Here's what happens next: our team will get you set up in our system, add you to the website and share your profile on our Instagram. We'd recommend adding <strong>@nicepeople.au</strong> to your bio - talent with agency tags tend to get booked more frequently.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                One of our agents will reach out shortly to set up a group chat with you. This is your direct line to us - it's where we'll send you casting opportunities, confirm bookings, and handle any day-to-day comms.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Your signed talent agreement is attached to this email for your records.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Looking forward to working with you.
              </p>
              ${EMAIL_SIGNATURE}
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Registration welcome email failed:", emailError);
      }
    }
    // Casting applicant thank-you email (only for signed-in users with a Google account)
    else if (!isRegistration && body.profile_id && body.email) {
      try {
        await resend.emails.send({
          from: "Nice People Casting <onboarding@resend.dev>",
          to: body.email,
          subject: "Thanks for applying!",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <p style="font-size: 16px; color: #333;">Hey ${body.first_name || "there"},</p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Thanks for submitting your application! Our casting team will review your details and be in touch if you're a match.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Since you're signed in with Google, your details are saved to your profile. Next time you apply, just sign in and everything will be pre-filled for you.
              </p>
              ${EMAIL_SIGNATURE}
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Applicant thank-you email failed:", emailError);
      }
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

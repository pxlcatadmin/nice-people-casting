import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";
import { Resend } from "resend";
import { EMAIL_SIGNATURE } from "@/lib/email-signature";
import { generateAgreementPdf } from "@/lib/generate-agreement-pdf";

const resend = new Resend(process.env.RESEND_API_KEY);

// Sender must be on a domain verified in Resend, otherwise every send
// is rejected with a 403. Overridable via env so the sender can be
// switched without a redeploy.
const EMAIL_FROM = process.env.EMAIL_FROM || "Nice People <hello@nicepeople.au>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "info@nicepeople.au";

// ---------- Admin email templates ----------

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function row(label: string, value: unknown): string {
  return `<tr>
    <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #6b7280; font-size: 13px; white-space: nowrap;">${label}</td>
    <td style="padding: 6px 0; vertical-align: top; color: #111827; font-size: 13px;">${esc(value)}</td>
  </tr>`;
}

function photoLinks(urls: string[] | undefined, label: string): string {
  if (!urls || urls.length === 0) return "";
  const list = urls
    .map(
      (u, i) => `<li style="margin: 2px 0;"><a href="${esc(u)}" style="color: #2563eb; text-decoration: none;">${label} ${i + 1}</a></li>`
    )
    .join("");
  return `<ul style="padding-left: 18px; margin: 6px 0;">${list}</ul>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCastingAdminEmail({ body, name, jobSlug }: { body: any; name: string; jobSlug: string }): string {
  return `
    <h2 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0 0 12px;">New casting application</h2>
    <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0 0 12px; color: #6b7280;">Job: <strong>${esc(jobSlug)}</strong></p>
    <table style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; border-collapse: collapse;">
      ${row("Name", name)}
      ${row("Email", body.email)}
      ${row("Phone", body.phone)}
      ${row("Instagram", body.instagram)}
      ${row("Gender", body.gender)}
      ${row("Experience", body.experience_level)}
      ${row("Digis", (body.digis || []).length)}
      ${row("Portfolio", (body.portfolio || []).length)}
    </table>
    ${body.previous_work
      ? `<p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 12px 0 4px; color: #6b7280; font-size: 13px;">Previous work:</p>
         <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px;">${(body.previous_work as string).split("\n").filter((l: string) => l.trim()).map((l: string) => `<a href="${esc(l.trim())}" style="color: #2563eb; text-decoration: none;">${esc(l.trim())}</a>`).join("<br>")}</div>`
      : ""}
    <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px 0 0;">
      <a href="https://casting.nicepeople.au/admin" style="color: #2563eb;">Open in admin →</a>
    </p>
  `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRegistrationAdminEmail({ body, name, submissionId }: { body: any; name: string; submissionId: string | undefined }): string {
  const reg = body.registration_data || {};
  const digis: string[] = body.digis || [];
  const portfolio: string[] = body.portfolio || [];
  const adminLink = `https://casting.nicepeople.au/admin`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; padding: 24px; color: #111827;">
      <h1 style="font-size: 20px; margin: 0 0 4px;">New talent registration</h1>
      <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px;">
        ${esc(name)} completed the registration on casting.nicepeople.au.
      </p>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Contact</h3>
      <table style="border-collapse: collapse; width: 100%;">
        ${row("Name", name)}
        ${row("Email", body.email)}
        ${row("Phone", body.phone)}
        ${row("Instagram", body.instagram)}
        ${row("Date of birth", body.date_of_birth)}
        ${row("Gender", body.gender)}
        ${reg.address ? row("Address", reg.address) : ""}
        ${reg.social_tiktok ? row("TikTok", reg.social_tiktok) : ""}
      </table>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Measurements</h3>
      <table style="border-collapse: collapse; width: 100%;">
        ${row("Height", body.height_cm ? `${body.height_cm}cm` : null)}
        ${reg.weight ? row("Weight", `${reg.weight}kg`) : ""}
        ${row("Bust", body.bust_cm ? `${body.bust_cm}cm` : null)}
        ${row("Waist", body.waist_cm ? `${body.waist_cm}cm` : null)}
        ${row("Hips", body.hips_cm ? `${body.hips_cm}cm` : null)}
        ${row("Shoe size", body.shoe_size)}
        ${reg.pants_size ? row("Pants", reg.pants_size) : ""}
        ${reg.top_size ? row("Top", reg.top_size) : ""}
        ${reg.inseam ? row("Inseam", `${reg.inseam}cm`) : ""}
        ${row("Hair", body.hair_color)}
        ${reg.hair_length ? row("Hair length", reg.hair_length) : ""}
        ${row("Eyes", body.eye_color)}
      </table>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Experience</h3>
      <table style="border-collapse: collapse; width: 100%;">
        ${row("Level", body.experience_level)}
        ${body.experience_notes ? row("Notes", body.experience_notes) : ""}
        ${reg.languages ? row("Languages", reg.languages) : ""}
        ${reg.special_talents ? row("Special talents", reg.special_talents) : ""}
        ${reg.notable_clients ? row("Notable clients", reg.notable_clients) : ""}
        ${reg.availability ? row("Availability", reg.availability) : ""}
      </table>

      ${reg.emergency_contact_name || reg.emergency_contact_phone ? `
        <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Emergency contact</h3>
        <table style="border-collapse: collapse; width: 100%;">
          ${row("Name", reg.emergency_contact_name)}
          ${row("Relationship", reg.emergency_contact_relationship)}
          ${row("Phone", reg.emergency_contact_phone)}
        </table>
      ` : ""}

      ${reg.bank_name || reg.abn || reg.tfn ? `
        <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Payment details</h3>
        <table style="border-collapse: collapse; width: 100%;">
          ${reg.bank_name ? row("Bank", reg.bank_name) : ""}
          ${reg.bank_bsb ? row("BSB", reg.bank_bsb) : ""}
          ${reg.bank_account ? row("Account", reg.bank_account) : ""}
          ${reg.abn ? row("ABN", reg.abn) : ""}
          ${reg.tfn ? row("TFN", reg.tfn) : ""}
        </table>
      ` : ""}

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Photos</h3>
      <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">
        <strong style="color: #111827;">Digitals (${digis.length})</strong> — click each to open/save
      </p>
      ${digis.length > 0 ? photoLinks(digis, "Digital") : `<p style="color: #9ca3af; font-size: 13px; margin: 4px 0;">No digitals uploaded.</p>`}
      <p style="margin: 12px 0 4px; color: #6b7280; font-size: 13px;">
        <strong style="color: #111827;">Portfolio (${portfolio.length})</strong>
      </p>
      ${portfolio.length > 0 ? photoLinks(portfolio, "Portfolio") : `<p style="color: #9ca3af; font-size: 13px; margin: 4px 0;">No portfolio photos uploaded — talent doesn't have any yet, consider organising test shoots.</p>`}

      ${reg.how_heard ? `
        <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">How they heard about us</h3>
        <p style="margin: 4px 0; font-size: 13px;">${esc(reg.how_heard)}</p>
      ` : ""}

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Legal</h3>
      <table style="border-collapse: collapse; width: 100%;">
        ${row("Code of conduct", reg.code_of_conduct_agreed ? "Agreed" : "Not agreed")}
        ${row("Talent agreement", reg.agreement_signed ? "Signed" : "Not signed")}
        ${reg.agreement_signature ? row("Signature", reg.agreement_signature) : ""}
        ${reg.agreement_signed_at ? row("Signed at", new Date(reg.agreement_signed_at).toLocaleString("en-AU")) : ""}
      </table>

      <p style="margin: 24px 0 0;">
        <a href="${adminLink}" style="display: inline-block; padding: 10px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 13px; font-weight: 600;">Open in admin</a>
      </p>
      ${submissionId ? `<p style="margin: 12px 0 0; color: #9ca3af; font-size: 11px;">Submission ID: ${esc(submissionId)}</p>` : ""}
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const jobSlug = body.job_slug;

    // Find the job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, type, title")
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
      previous_work: body.previous_work || "",
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
      const html = isRegistration
        ? buildRegistrationAdminEmail({ body, name, submissionId: submission?.id })
        : buildCastingAdminEmail({ body, name, jobSlug });

      const { error: sendError } = await resend.emails.send({
        from: EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject: isRegistration ? `New talent registration — ${name}` : `New application — ${name}`,
        html,
      });
      // The Resend SDK returns errors rather than throwing, so an unchecked
      // call fails silently (this is how a 403 unverified-domain error went
      // unnoticed). Surface it so it shows up in the platform logs.
      if (sendError) {
        console.error("[email] Admin notification REJECTED by Resend:", JSON.stringify(sendError));
      }
    } catch (emailError) {
      console.error("[email] Admin notification threw:", emailError);
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

        const { error: welcomeError } = await resend.emails.send({
          from: EMAIL_FROM,
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
                Here's what happens next: our team will get you set up in our system, add you to the website and share your profile on our Instagram. We'd recommend adding <strong>@nicepeopleau</strong> to your bio - talent with agency tags tend to get booked more frequently.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                One of our agents will reach out shortly to set up a WhatsApp group chat with you. This is your direct line to us - it's where we'll send you casting opportunities, confirm bookings, and handle any day-to-day comms.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Please make sure you have WhatsApp downloaded on your phone and a number registered - <a href="https://www.whatsapp.com/download" style="color: #333; font-weight: 600;">download here</a>.
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
        if (welcomeError) {
          console.error("[email] Welcome email REJECTED by Resend:", JSON.stringify(welcomeError));
        }
      } catch (emailError) {
        console.error("[email] Welcome email threw:", emailError);
      }
    }
    // Casting applicant thank-you email — sent to every applicant who gave
    // us an email address, signed in or not.
    else if (!isRegistration && body.email) {
      try {
        const { error: thanksError } = await resend.emails.send({
          from: EMAIL_FROM,
          to: body.email,
          subject: "Thanks for applying!",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <p style="font-size: 16px; color: #333;">Hey ${body.first_name || "there"},</p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Thanks for submitting your application${job.title ? ` for <strong>${esc(job.title)}</strong>` : ""}. Our casting team reviews every submission and we'll be in touch if you're a match.
              </p>
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                In the meantime, follow us on Instagram. We post new casting calls there first, so it's the best way to hear about roles as they come up.
              </p>
              <p style="margin: 24px 0;">
                <a href="https://www.instagram.com/nicepeopleau/" style="display: inline-block; padding: 12px 24px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600;">Follow @nicepeopleau</a>
              </p>
              ${body.profile_id ? `
              <p style="font-size: 14px; color: #777; line-height: 1.6;">
                Your details are saved to your profile. Next time you apply, just sign in and everything will be pre-filled for you.
              </p>
              ` : ""}
              ${EMAIL_SIGNATURE}
            </div>
          `,
        });
        if (thanksError) {
          console.error("[email] Applicant thank-you REJECTED by Resend:", JSON.stringify(thanksError));
        }
      } catch (emailError) {
        console.error("[email] Applicant thank-you threw:", emailError);
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

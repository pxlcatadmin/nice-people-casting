import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { EMAIL_SIGNATURE } from "@/lib/email-signature";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, first_name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Nice People Casting <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Nice People!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <p style="font-size: 16px; color: #333;">Hey ${first_name || "there"},</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Welcome to Nice People! Your profile has been created and your details are now saved.
          </p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Here's how it works from now on:
          </p>
          <ul style="font-size: 15px; color: #555; line-height: 1.8; padding-left: 20px;">
            <li>When you apply for future casting calls, just tap "Sign in with Google" and your details will be auto-filled.</li>
            <li>Any updates you make to your details (measurements, photos, etc.) will automatically be saved to your profile.</li>
            <li>No more re-entering the same info every time.</li>
          </ul>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Keep an eye on our Instagram for upcoming casting calls!
          </p>
          ${EMAIL_SIGNATURE}
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome email failed:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

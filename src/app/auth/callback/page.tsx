"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "saving" | "done" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      // Supabase handles the OAuth token exchange automatically
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("error");
        setMessage("Sign-in failed. Please try again.");
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email || "";

      // Check what action we need to perform
      const action = localStorage.getItem("np_auth_action");
      const returnSlug = localStorage.getItem("np_auth_return");

      if (action === "save_profile") {
        // Save profile from last submission data
        setStatus("saving");
        setMessage("Saving your profile...");

        const savedData = localStorage.getItem("np_profile_data");
        if (savedData) {
          const data = JSON.parse(savedData);

          // Upsert profile
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: userId,
            email: userEmail,
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            phone: data.phone || "",
            instagram: data.instagram || "",
            date_of_birth: data.date_of_birth || null,
            gender: data.gender || "",
            height_cm: data.height_cm ? parseInt(data.height_cm) : null,
            bust_cm: data.bust_cm ? parseInt(data.bust_cm) : null,
            waist_cm: data.waist_cm ? parseInt(data.waist_cm) : null,
            hips_cm: data.hips_cm ? parseInt(data.hips_cm) : null,
            shoe_size: data.shoe_size || "",
            hair_color: data.hair_color || "",
            eye_color: data.eye_color || "",
            experience_level: data.experience_level || "none",
            experience_notes: data.experience_notes || "",
            saved_digis: data.digis || [],
            updated_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error("Profile save error:", profileError);
          }

          // Link the submission to this profile if we have a submission ID
          const submissionId = localStorage.getItem("np_submission_id");
          if (submissionId) {
            await supabase
              .from("submissions")
              .update({ profile_id: userId })
              .eq("id", submissionId);
          }
        }

        // Clean up
        localStorage.removeItem("np_auth_action");
        localStorage.removeItem("np_profile_data");
        localStorage.removeItem("np_submission_id");
        localStorage.removeItem("np_auth_return");

        setStatus("done");
        setMessage("Profile saved! Next time you apply, sign in to autofill your details.");

      } else if (action === "autofill") {
        // Fetch profile and store for autofill
        setStatus("saving");
        setMessage("Loading your profile...");

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profile) {
          sessionStorage.setItem("np_autofill", JSON.stringify(profile));
        } else {
          // First-timer who clicked sign in - pass their ID and email so the form knows they're authenticated
          sessionStorage.setItem("np_autofill", JSON.stringify({ id: userId, email: userEmail }));
        }

        // Clean up and redirect back to the form
        localStorage.removeItem("np_auth_action");
        const slug = returnSlug || "/";
        localStorage.removeItem("np_auth_return");

        window.location.href = `/${slug}`;
        return;

      } else {
        // Unknown action, just redirect home
        localStorage.removeItem("np_auth_action");
        localStorage.removeItem("np_auth_return");
        setStatus("done");
        setMessage("Signed in successfully.");
      }
    }

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <Image
        src="https://i.ibb.co/v2dbL7X/Group-9.png"
        alt="Nice People"
        width={60}
        height={60}
        className="mb-6"
        unoptimized
      />

      {status === "loading" && (
        <p className="text-gray-400 text-sm animate-pulse">Signing in...</p>
      )}

      {status === "saving" && (
        <p className="text-gray-400 text-sm animate-pulse">{message}</p>
      )}

      {status === "done" && (
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">You&apos;re all set</h1>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}

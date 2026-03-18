import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadFiles(files: File[], jobId: string, folder: string) {
  const urls: string[] = [];

  for (const file of files) {
    if (file.size > 0) {
      const ext = file.name.split(".").pop();
      const fileName = `${jobId}/${folder}/${uuidv4()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("submissions").getPublicUrl(fileName);
        urls.push(publicUrl);
      }
    }
  }

  return urls;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const jobSlug = formData.get("job_slug") as string;

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

    // Upload digis and portfolio separately
    const digis = formData.getAll("digis") as File[];
    const portfolio = formData.getAll("portfolio") as File[];

    const digiUrls = await uploadFiles(digis, job.id, "digis");
    const portfolioUrls = await uploadFiles(portfolio, job.id, "portfolio");

    // Insert submission
    const { error: insertError } = await supabase.from("submissions").insert({
      job_id: job.id,
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || "",
      instagram: (formData.get("instagram") as string) || "",
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      gender: (formData.get("gender") as string) || "",
      height_cm: formData.get("height_cm")
        ? parseInt(formData.get("height_cm") as string)
        : null,
      bust_cm: formData.get("bust_cm")
        ? parseInt(formData.get("bust_cm") as string)
        : null,
      waist_cm: formData.get("waist_cm")
        ? parseInt(formData.get("waist_cm") as string)
        : null,
      hips_cm: formData.get("hips_cm")
        ? parseInt(formData.get("hips_cm") as string)
        : null,
      shoe_size: (formData.get("shoe_size") as string) || "",
      hair_color: (formData.get("hair_color") as string) || "",
      eye_color: (formData.get("eye_color") as string) || "",
      experience_level:
        (formData.get("experience_level") as string) || "none",
      experience_notes: (formData.get("experience_notes") as string) || "",
      digis: digiUrls,
      portfolio: portfolioUrls,
      photos: [...digiUrls, ...portfolioUrls], // combined for backwards compat
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

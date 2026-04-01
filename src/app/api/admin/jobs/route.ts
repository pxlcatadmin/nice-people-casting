import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function isAuthed(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never) {
  return cookieStore.get("admin_auth")?.value === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*, submissions(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let title: string;
  let description: string;
  let shoot_date: string | null;
  let asset_config: unknown;
  let brief_url: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    title = formData.get("title") as string;
    description = (formData.get("description") as string) || "";
    shoot_date = (formData.get("shoot_date") as string) || null;
    asset_config = formData.get("asset_config") ? JSON.parse(formData.get("asset_config") as string) : undefined;

    const briefFile = formData.get("brief") as File | null;
    if (briefFile && briefFile.size > 0) {
      const fileName = `briefs/${uuidv4()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(fileName, briefFile, { contentType: "application/pdf" });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("submissions").getPublicUrl(fileName);
        brief_url = publicUrl;
      }
    }
  } else {
    const body = await request.json();
    title = body.title;
    description = body.description || "";
    shoot_date = body.shoot_date || null;
    asset_config = body.asset_config;
  }

  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Check for duplicate slugs and append a number if needed
  const { data: existing } = await supabase
    .from("jobs")
    .select("slug")
    .like("slug", `${slug}%`);

  if (existing && existing.length > 0) {
    const existingSlugs = new Set(existing.map((j: { slug: string }) => j.slug));
    if (existingSlugs.has(slug)) {
      let counter = 2;
      while (existingSlugs.has(`${slug}-${counter}`)) counter++;
      slug = `${slug}-${counter}`;
    }
  }

  const insertData: Record<string, unknown> = {
    title,
    slug,
    description,
    shoot_date,
    asset_config: asset_config || undefined,
  };
  if (brief_url) insertData.brief_url = brief_url;

  const { data, error } = await supabase
    .from("jobs")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let id: string;
  let updates: Record<string, unknown>;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    id = formData.get("id") as string;
    updates = {};

    if (formData.get("title")) updates.title = formData.get("title") as string;
    if (formData.get("description") !== null) updates.description = formData.get("description") as string;
    if (formData.get("shoot_date") !== null) updates.shoot_date = (formData.get("shoot_date") as string) || null;
    if (formData.get("asset_config")) updates.asset_config = JSON.parse(formData.get("asset_config") as string);
    if (formData.get("status")) updates.status = formData.get("status") as string;

    const briefFile = formData.get("brief") as File | null;
    if (briefFile && briefFile.size > 0) {
      const fileName = `briefs/${uuidv4()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(fileName, briefFile, { contentType: "application/pdf" });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("submissions").getPublicUrl(fileName);
        updates.brief_url = publicUrl;
      }
    }

    if (formData.get("remove_brief") === "true") {
      updates.brief_url = null;
    }
  } else {
    const body = await request.json();
    id = body.id;
    const { id: _id, ...rest } = body;
    updates = rest;
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthed(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  // Delete submissions first (foreign key)
  await supabase.from("submissions").delete().eq("job_id", id);

  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

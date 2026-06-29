#!/usr/bin/env node
/**
 * Bulk talent ingestion script.
 *
 * Usage: node scripts/ingest-talents.mjs [talents-folder]
 * Defaults to ~/Desktop/talents
 *
 * Expects:
 *   - <talents-folder>/_template.csv  with rows of talent metadata
 *   - <talents-folder>/<Talent Name>/  subfolder per talent with photos
 *     and optionally a self-tape video file
 *   - A "Talent Pool" job already created in admin (slug: talent-pool)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// ----- env loading (avoid adding dotenv as a dep) -----
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Missing .env.local at ${envPath}`);
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+[A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv(path.join(projectRoot, ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- CSV parsing (handles basic quoting) -----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))
  );
}

// ----- helpers -----
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function contentTypeFor(ext) {
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4v": "video/x-m4v",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

async function uploadFile(localPath, destPath) {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath);
  const { error } = await supabase.storage
    .from("submissions")
    .upload(destPath, buffer, {
      contentType: contentTypeFor(ext),
      upsert: false,
    });
  // If the object already exists from a prior run, treat as success and
  // just return the public URL. Real errors (size limit, RLS) still throw.
  if (error) {
    const msg = (error.message || "").toLowerCase();
    const isDuplicate =
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("resource already exists");
    if (!isDuplicate) {
      throw new Error(`Upload failed for ${localPath}: ${error.message}`);
    }
  }
  const { data } = supabase.storage.from("submissions").getPublicUrl(destPath);
  return data.publicUrl;
}

async function findTalentPoolJob() {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("slug", "talent-pool")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function findExistingSubmission(jobId, firstName, lastName) {
  const { data } = await supabase
    .from("submissions")
    .select("id")
    .eq("job_id", jobId)
    .eq("first_name", firstName)
    .eq("last_name", lastName)
    .maybeSingle();
  return data;
}

// ----- main -----
async function main() {
  const talentsFolder =
    process.argv[2] || path.join(process.env.HOME || "~", "Desktop", "talents");

  console.log("🎬 Talent ingestion");
  console.log(`📁 Folder: ${talentsFolder}`);

  if (!fs.existsSync(talentsFolder)) {
    console.error(`❌ Folder not found: ${talentsFolder}`);
    process.exit(1);
  }

  const csvPath = path.join(talentsFolder, "_template.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Missing _template.csv in ${talentsFolder}`);
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(csvPath, "utf8"));
  console.log(`📋 Found ${rows.length} talent rows in CSV`);

  const job = await findTalentPoolJob();
  if (!job) {
    console.error(
      `❌ No "Talent Pool" job found (slug=talent-pool). Create it in admin first (title "Talent Pool"), then re-run.`
    );
    process.exit(1);
  }
  console.log(`✅ Talent Pool job: ${job.id}`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      console.log("⏭️  Skipping row with no name");
      continue;
    }

    const [firstName, ...lastParts] = name.split(/\s+/);
    const lastName = lastParts.join(" ") || "";

    console.log(`\n👤 ${name}`);

    try {
      const existing = await findExistingSubmission(job.id, firstName, lastName);
      if (existing) {
        console.log(`  ⏭️  Already exists (id ${existing.id}) — skipping`);
        skipped++;
        continue;
      }

      // Find the subfolder (case-insensitive match)
      const entries = fs.readdirSync(talentsFolder, { withFileTypes: true });
      const folderEntry = entries.find(
        (e) => e.isDirectory() && e.name.toLowerCase() === name.toLowerCase()
      );
      if (!folderEntry) {
        console.log(`  ⚠️  No subfolder found for "${name}"`);
        failed++;
        continue;
      }

      const talentFolder = path.join(talentsFolder, folderEntry.name);
      const files = fs.readdirSync(talentFolder).filter((f) => !f.startsWith("."));
      const photoFiles = files.filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f));
      const videoFile = files.find((f) => /\.(mp4|mov|webm|m4v)$/i.test(f));

      if (!photoFiles.length && !videoFile && !row.self_tape_url) {
        console.log(`  ⚠️  No photos/video/link found — skipping`);
        failed++;
        continue;
      }

      const slug = slugify(name);
      const photoUrls = [];
      for (const photo of photoFiles) {
        const dest = `talent-pool/${slug}/${photo}`;
        const url = await uploadFile(path.join(talentFolder, photo), dest);
        photoUrls.push(url);
        console.log(`  📸 ${photo}`);
      }

      let selfTapeUrl = row.self_tape_url?.trim() || "";
      if (videoFile && !selfTapeUrl) {
        const dest = `talent-pool/${slug}/${videoFile}`;
        selfTapeUrl = await uploadFile(path.join(talentFolder, videoFile), dest);
        console.log(`  🎥 ${videoFile}`);
      } else if (selfTapeUrl) {
        console.log(`  🔗 ${selfTapeUrl}`);
      }

      const adminNotes = [
        row.role && `Role: ${row.role}`,
        row.build && `Build: ${row.build}`,
        row.playing_age && `Playing age: ${row.playing_age}`,
        row.ethnicity && `Ethnicity: ${row.ethnicity}`,
        row.bio && `\nBio:\n${row.bio}`,
      ]
        .filter(Boolean)
        .join("\n");

      const heightCm = row.height ? parseInt(String(row.height).replace(/[^\d]/g, ""), 10) : null;

      const { error: insertError } = await supabase.from("submissions").insert({
        job_id: job.id,
        first_name: firstName,
        last_name: lastName,
        email: "",
        phone: "",
        instagram: row.instagram?.replace(/^@/, "") || "",
        gender: "",
        height_cm: Number.isFinite(heightCm) ? heightCm : null,
        hair_color: row.hair || "",
        eye_color: row.eyes || "",
        digis: photoUrls,
        portfolio: [],
        photos: photoUrls,
        self_tape_url: selfTapeUrl,
        experience_level: "none",
        experience_notes: "",
        admin_notes: adminNotes,
        status: "new",
      });

      if (insertError) throw new Error(insertError.message);
      console.log(`  ✅ Created`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done — ${success} created, ${skipped} skipped, ${failed} failed`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

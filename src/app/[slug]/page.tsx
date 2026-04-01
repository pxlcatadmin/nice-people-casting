"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface MeasurementFields {
  height_cm: FieldConfig;
  bust_cm: FieldConfig;
  waist_cm: FieldConfig;
  hips_cm: FieldConfig;
  shoe_size: FieldConfig;
  hair_color: FieldConfig;
  eye_color: FieldConfig;
}

interface AboutFields {
  phone: FieldConfig;
  instagram: FieldConfig;
  date_of_birth: FieldConfig;
  gender: FieldConfig;
}

interface AssetConfig {
  digis: { enabled: boolean; required: boolean; min: number; max: number };
  portfolio: { enabled: boolean; required: boolean; max: number };
  self_tape: { enabled: boolean; required: boolean };
  measurements: { enabled: boolean; fields: MeasurementFields };
  about: { fields: AboutFields };
  experience: { enabled: boolean };
}

interface JobInfo {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  asset_config: AssetConfig;
  shoot_date: string | null;
  brief_url: string | null;
}

const fc = (enabled = true, required = false): FieldConfig => ({ enabled, required });

const DEFAULT_ASSET_CONFIG: AssetConfig = {
  digis: { enabled: true, required: true, min: 4, max: 8 },
  portfolio: { enabled: true, required: false, max: 10 },
  self_tape: { enabled: false, required: false },
  measurements: {
    enabled: true,
    fields: { height_cm: fc(), bust_cm: fc(), waist_cm: fc(), hips_cm: fc(), shoe_size: fc(), hair_color: fc(), eye_color: fc() },
  },
  about: {
    fields: { phone: fc(), instagram: fc(), date_of_birth: fc(), gender: fc() },
  },
  experience: { enabled: true },
};

function normalizeField(val: unknown, def: FieldConfig): FieldConfig {
  if (typeof val === "boolean") return { enabled: val, required: false };
  if (val && typeof val === "object") return { enabled: (val as FieldConfig).enabled ?? def.enabled, required: (val as FieldConfig).required ?? def.required };
  return def;
}

export default function SubmissionForm() {
  const { slug } = useParams();
  const [job, setJob] = useState<JobInfo | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState("");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${slug}`);
        if (!res.ok) {
          setJobError("not_found");
        } else {
          const data = await res.json();
          if (data.status === "closed") {
            setJobError("closed");
          }
          setJob(data);
        }
      } catch {
        setJobError("error");
      }
      setJobLoading(false);
    }
    fetchJob();
  }, [slug]);

  const [digiFiles, setDigiFiles] = useState<File[]>([]);
  const [digiPreviews, setDigiPreviews] = useState<string[]>([]);
  const [savedDigiUrls, setSavedDigiUrls] = useState<string[]>([]);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const digiInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [uploadedDigiUrls, setUploadedDigiUrls] = useState<string[]>([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    instagram: "",
    date_of_birth: "",
    gender: "",
    height_cm: "",
    bust_cm: "",
    waist_cm: "",
    hips_cm: "",
    shoe_size: "",
    hair_color: "",
    eye_color: "",
    experience_level: "none",
    experience_notes: "",
    self_tape_url: "",
  });

  // Check for autofill data from Google sign-in
  useEffect(() => {
    const autofill = sessionStorage.getItem("np_autofill");
    if (autofill) {
      sessionStorage.removeItem("np_autofill");
      const p = JSON.parse(autofill);
      setProfileId(p.id);
      setForm((prev) => ({
        ...prev,
        first_name: p.first_name || prev.first_name,
        last_name: p.last_name || prev.last_name,
        email: p.email || prev.email,
        phone: p.phone || prev.phone,
        instagram: p.instagram || prev.instagram,
        date_of_birth: p.date_of_birth || prev.date_of_birth,
        gender: p.gender || prev.gender,
        height_cm: p.height_cm ? String(p.height_cm) : prev.height_cm,
        bust_cm: p.bust_cm ? String(p.bust_cm) : prev.bust_cm,
        waist_cm: p.waist_cm ? String(p.waist_cm) : prev.waist_cm,
        hips_cm: p.hips_cm ? String(p.hips_cm) : prev.hips_cm,
        shoe_size: p.shoe_size || prev.shoe_size,
        hair_color: p.hair_color || prev.hair_color,
        eye_color: p.eye_color || prev.eye_color,
        experience_level: p.experience_level || prev.experience_level,
        experience_notes: p.experience_notes || prev.experience_notes,
      }));
      // Pre-load saved digis
      if (p.saved_digis && p.saved_digis.length > 0) {
        setSavedDigiUrls(p.saved_digis);
        setDigiPreviews(p.saved_digis);
      }
      // Skip to About You step (step 2)
      setStep(2);
    }
  }, []);

  // Merge job config with defaults for backward compatibility with old jobs
  const config = useMemo((): AssetConfig => {
    const raw = job?.asset_config as Record<string, unknown> | undefined;
    if (!raw) return DEFAULT_ASSET_CONFIG;
    const r = raw as Partial<AssetConfig>;
    const rawMF = (r.measurements as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
    const rawAF = (r.about as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
    return {
      digis: { ...DEFAULT_ASSET_CONFIG.digis, ...r.digis },
      portfolio: { ...DEFAULT_ASSET_CONFIG.portfolio, ...r.portfolio },
      self_tape: { ...DEFAULT_ASSET_CONFIG.self_tape, ...r.self_tape },
      measurements: {
        enabled: (r.measurements as { enabled?: boolean })?.enabled ?? true,
        fields: {
          height_cm: normalizeField(rawMF?.height_cm, DEFAULT_ASSET_CONFIG.measurements.fields.height_cm),
          bust_cm: normalizeField(rawMF?.bust_cm, DEFAULT_ASSET_CONFIG.measurements.fields.bust_cm),
          waist_cm: normalizeField(rawMF?.waist_cm, DEFAULT_ASSET_CONFIG.measurements.fields.waist_cm),
          hips_cm: normalizeField(rawMF?.hips_cm, DEFAULT_ASSET_CONFIG.measurements.fields.hips_cm),
          shoe_size: normalizeField(rawMF?.shoe_size, DEFAULT_ASSET_CONFIG.measurements.fields.shoe_size),
          hair_color: normalizeField(rawMF?.hair_color, DEFAULT_ASSET_CONFIG.measurements.fields.hair_color),
          eye_color: normalizeField(rawMF?.eye_color, DEFAULT_ASSET_CONFIG.measurements.fields.eye_color),
        },
      },
      about: {
        fields: {
          phone: normalizeField(rawAF?.phone, DEFAULT_ASSET_CONFIG.about.fields.phone),
          instagram: normalizeField(rawAF?.instagram, DEFAULT_ASSET_CONFIG.about.fields.instagram),
          date_of_birth: normalizeField(rawAF?.date_of_birth, DEFAULT_ASSET_CONFIG.about.fields.date_of_birth),
          gender: normalizeField(rawAF?.gender, DEFAULT_ASSET_CONFIG.about.fields.gender),
        },
      },
      experience: { enabled: (r.experience as { enabled?: boolean })?.enabled ?? true },
    };
  }, [job?.asset_config]);

  // Build dynamic steps - welcome is always first, about is always second
  const steps = useMemo(() => {
    const s: string[] = ["welcome", "about"];
    if (config.measurements.enabled) s.push("measurements");
    if (config.digis.enabled) s.push("digis");
    if (config.portfolio.enabled) s.push("portfolio");
    if (config.self_tape.enabled) s.push("self_tape");
    if (config.experience.enabled) s.push("experience");
    return s;
  }, [config]);

  const TOTAL_STEPS = steps.length;
  const currentStepName = steps[step - 1];

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDigis = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const max = config.digis?.max || 8;
    const available = max - savedDigiUrls.length;
    const newFiles = [...digiFiles, ...files].slice(0, available);
    setDigiFiles(newFiles);
    setDigiPreviews([...savedDigiUrls, ...newFiles.map((f) => URL.createObjectURL(f))]);
  };

  const removeDigis = (index: number) => {
    if (index < savedDigiUrls.length) {
      // Removing a saved digi
      setSavedDigiUrls((prev) => prev.filter((_, i) => i !== index));
      setDigiPreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Removing a newly added file
      const fileIndex = index - savedDigiUrls.length;
      setDigiFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      setDigiPreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handlePortfolio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const max = config.portfolio?.max || 10;
    const newFiles = [...portfolioFiles, ...files].slice(0, max);
    setPortfolioFiles(newFiles);
    setPortfolioPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removePortfolio = (index: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index));
    setPortfolioPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    if (currentStepName === "welcome") return true;
    if (currentStepName === "about") {
      if (!form.first_name || !form.last_name || !form.email) return false;
      const af = config.about.fields;
      if (af.phone.enabled && af.phone.required && !form.phone.trim()) return false;
      if (af.instagram.enabled && af.instagram.required && !form.instagram.trim()) return false;
      if (af.date_of_birth.enabled && af.date_of_birth.required && !form.date_of_birth) return false;
      if (af.gender.enabled && af.gender.required && !form.gender) return false;
      return true;
    }
    if (currentStepName === "measurements") {
      const mf = config.measurements.fields;
      if (mf.height_cm.enabled && mf.height_cm.required && !form.height_cm) return false;
      if (mf.bust_cm.enabled && mf.bust_cm.required && !form.bust_cm) return false;
      if (mf.waist_cm.enabled && mf.waist_cm.required && !form.waist_cm) return false;
      if (mf.hips_cm.enabled && mf.hips_cm.required && !form.hips_cm) return false;
      if (mf.shoe_size.enabled && mf.shoe_size.required && !form.shoe_size.trim()) return false;
      if (mf.hair_color.enabled && mf.hair_color.required && !form.hair_color.trim()) return false;
      if (mf.eye_color.enabled && mf.eye_color.required && !form.eye_color.trim()) return false;
      return true;
    }
    if (currentStepName === "digis") {
      if (config.digis?.required) {
        return (digiFiles.length + savedDigiUrls.length) >= (config.digis?.min || 1);
      }
      return true;
    }
    if (currentStepName === "portfolio") {
      if (config.portfolio?.required) return portfolioFiles.length > 0;
      return true;
    }
    if (currentStepName === "self_tape") {
      if (config.self_tape?.required) return form.self_tape_url.trim().length > 0;
      return true;
    }
    return true;
  };

  const getButtonLabel = () => {
    if (step === TOTAL_STEPS) return submitting ? "Submitting..." : "Submit application";
    if (currentStepName === "portfolio" && portfolioFiles.length === 0) return "Skip";
    if (currentStepName === "self_tape" && !config.self_tape?.required && !form.self_tape_url.trim()) return "Skip";
    return "Continue";
  };

  const resizeImage = (file: File, maxDim: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFileToStorage = async (file: File, folder: string): Promise<string | null> => {
    const resized = await resizeImage(file, 2000);
    const fileName = `${slug}/${folder}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(fileName, resized, { contentType: "image/jpeg" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from("submissions").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const totalFiles = digiFiles.length + portfolioFiles.length;
      if (totalFiles > 0) {
        setSubmitProgress(`Uploading ${totalFiles} new photo${totalFiles !== 1 ? "s" : ""}...`);
      }

      // Upload all photos in parallel for speed
      const [digiResults, portfolioResults] = await Promise.all([
        Promise.all(digiFiles.map((f) => uploadFileToStorage(f, "digis"))),
        Promise.all(portfolioFiles.map((f) => uploadFileToStorage(f, "portfolio"))),
      ]);

      const newDigiUrls = digiResults.filter(Boolean) as string[];
      const portfolioUrls = portfolioResults.filter(Boolean) as string[];

      // Combine saved digi URLs (from profile) with newly uploaded ones
      const allDigiUrls = [...savedDigiUrls, ...newDigiUrls];
      setUploadedDigiUrls(allDigiUrls);

      setSubmitProgress("Saving your application...");

      // Send just the data + URLs to the API (no files)
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_slug: slug,
          ...form,
          digis: allDigiUrls,
          portfolio: portfolioUrls,
          profile_id: profileId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }

      if (data.submission_id) setSubmissionId(data.submission_id);
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <Image
          src="https://i.ibb.co/v2dbL7X/Group-9.png"
          alt="Nice People"
          width={48}
          height={48}
          className="mb-6 animate-pulse"
          unoptimized
        />
      </div>
    );
  }

  if (jobError === "not_found") {
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
        <h1 className="text-2xl font-semibold text-center mb-3">
          Page not found
        </h1>
        <p className="text-gray-500 text-center max-w-sm">
          This casting link doesn&apos;t exist. Check the URL and try again,
          or contact Nice People if you think this is a mistake.
        </p>
      </div>
    );
  }

  if (jobError === "closed") {
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
        <h1 className="text-2xl font-semibold text-center mb-3">
          Applications closed
        </h1>
        <p className="text-gray-500 text-center max-w-sm">
          This casting call is no longer accepting submissions.
          Follow us on Instagram for future opportunities.
        </p>
      </div>
    );
  }

  if (submitted) {
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
        <h1 className="text-2xl font-semibold text-center mb-3">
          Thanks for applying!
        </h1>
        <p className="text-gray-500 text-center max-w-sm">
          We&apos;ve received your submission. If you&apos;re selected,
          we&apos;ll be in touch via email or Instagram.
        </p>

        {!profileId && (
          <div className="mt-8 w-full max-w-sm">
            <p className="text-gray-400 text-xs text-center mb-3">
              Save your details for next time - no re-typing, no re-uploading photos.
            </p>
            <button
              type="button"
              onClick={() => {
                const profileData = {
                  ...form,
                  digis: uploadedDigiUrls,
                };
                localStorage.setItem("np_auth_action", "save_profile");
                localStorage.setItem("np_profile_data", JSON.stringify(profileData));
                if (submissionId) localStorage.setItem("np_submission_id", submissionId);
                supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                });
              }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full border border-nice-border text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.39l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Save profile with Google
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-nice-border z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <Image
            src="https://i.ibb.co/v2dbL7X/Group-9.png"
            alt="Nice People"
            width={36}
            height={36}
            unoptimized
          />
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-1 w-8 rounded-full transition-colors ${
                  s <= step ? "bg-nice-black" : "bg-nice-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-6 py-8">
        <div key={step} className="animate-fade-in">
        {/* Welcome Screen */}
        {currentStepName === "welcome" && job && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              {job.description && (
                <p className="text-gray-500 text-sm mt-3">{job.description}</p>
              )}
              {job.shoot_date && (
                <p className="text-gray-400 text-sm mt-3">
                  Shoot date: {new Date(job.shoot_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            {job.brief_url && (
              <a
                href={job.brief_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-nice-border text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm6-10a1 1 0 011 1v4a1 1 0 01-2 0V9a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                View shoot details
              </a>
            )}

            {!profileId && (
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("np_auth_action", "autofill");
                  localStorage.setItem("np_auth_return", slug as string);
                  supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                  });
                }}
                className="text-gray-400 text-xs hover:text-gray-600 transition-colors"
              >
                Been here before? Sign in
              </button>
            )}
          </div>
        )}

        {/* About You */}
        {currentStepName === "about" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">About you</h2>
              <p className="text-gray-400 text-sm">
                Let&apos;s start with the basics.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                value={form.first_name}
                onChange={(v) => updateForm("first_name", v)}
                required
              />
              <Input
                label="Last name"
                value={form.last_name}
                onChange={(v) => updateForm("last_name", v)}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => updateForm("email", v)}
              required
            />

            {config.about.fields.phone.enabled && (
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(v) => updateForm("phone", v)}
                required={config.about.fields.phone.required}
              />
            )}

            {config.about.fields.instagram.enabled && (
              <Input
                label="Instagram handle"
                value={form.instagram}
                onChange={(v) => updateForm("instagram", v)}
                placeholder="@"
                required={config.about.fields.instagram.required}
              />
            )}

            {config.about.fields.date_of_birth.enabled && (
              <Input
                label="Date of birth"
                type="date"
                value={form.date_of_birth}
                onChange={(v) => updateForm("date_of_birth", v)}
                required={config.about.fields.date_of_birth.required}
              />
            )}

            {config.about.fields.gender.enabled && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Gender
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map(
                    (g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => updateForm("gender", g)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                          form.gender === g
                            ? "bg-nice-black text-white border-nice-black"
                            : "border-nice-border text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {g}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Measurements */}
        {currentStepName === "measurements" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Measurements</h2>
              <p className="text-gray-400 text-sm">
                Approximate is fine - no need to be exact.
              </p>
            </div>

            {config.measurements.fields.height_cm.enabled && (
              <Input
                label="Height (cm)"
                type="number"
                value={form.height_cm}
                onChange={(v) => updateForm("height_cm", v)}
                placeholder="e.g. 175"
                required={config.measurements.fields.height_cm.required}
              />
            )}

            {(config.measurements.fields.bust_cm.enabled || config.measurements.fields.waist_cm.enabled || config.measurements.fields.hips_cm.enabled) && (
              <div className="grid grid-cols-3 gap-3">
                {config.measurements.fields.bust_cm.enabled && (
                  <Input
                    label="Bust (cm)"
                    type="number"
                    value={form.bust_cm}
                    onChange={(v) => updateForm("bust_cm", v)}
                    required={config.measurements.fields.bust_cm.required}
                  />
                )}
                {config.measurements.fields.waist_cm.enabled && (
                  <Input
                    label="Waist (cm)"
                    type="number"
                    value={form.waist_cm}
                    onChange={(v) => updateForm("waist_cm", v)}
                    required={config.measurements.fields.waist_cm.required}
                  />
                )}
                {config.measurements.fields.hips_cm.enabled && (
                  <Input
                    label="Hips (cm)"
                    type="number"
                    value={form.hips_cm}
                    onChange={(v) => updateForm("hips_cm", v)}
                    required={config.measurements.fields.hips_cm.required}
                  />
                )}
              </div>
            )}

            {config.measurements.fields.shoe_size.enabled && (
              <Input
                label="Shoe size (AU)"
                value={form.shoe_size}
                onChange={(v) => updateForm("shoe_size", v)}
                placeholder="e.g. 9"
                required={config.measurements.fields.shoe_size.required}
              />
            )}

            {(config.measurements.fields.hair_color.enabled || config.measurements.fields.eye_color.enabled) && (
              <div className="grid grid-cols-2 gap-3">
                {config.measurements.fields.hair_color.enabled && (
                  <Input
                    label="Hair colour"
                    value={form.hair_color}
                    onChange={(v) => updateForm("hair_color", v)}
                    placeholder="e.g. Brown"
                    required={config.measurements.fields.hair_color.required}
                  />
                )}
                {config.measurements.fields.eye_color.enabled && (
                  <Input
                    label="Eye colour"
                    value={form.eye_color}
                    onChange={(v) => updateForm("eye_color", v)}
                    placeholder="e.g. Blue"
                    required={config.measurements.fields.eye_color.required}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Digitals */}
        {currentStepName === "digis" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Digitals</h2>
              <p className="text-gray-400 text-sm">
                Digitals (or &quot;digis&quot;) are simple, unedited photos that show what you
                actually look like. Think of them as your raw reference photos — no
                filters, no heavy makeup, no fancy lighting.
              </p>
              <div className="mt-3 p-3 bg-nice-gray rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1.5">What we need:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• A clear headshot (face straight on)</li>
                  <li>• A full body shot (head to toe)</li>
                  <li>• A profile shot (side on)</li>
                  <li>• A smile shot</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">
                  Natural light, plain background, minimal makeup. No editing or filters.
                  These help us see the real you.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {config.digis?.required
                ? `Minimum ${config.digis.min} photo${config.digis.min !== 1 ? "s" : ""} required`
                : "Optional"}{" "}
              • Up to {config.digis?.max || 8}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {digiPreviews.map((preview, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-nice-gray">
                  <img
                    src={preview}
                    alt={`Digital ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeDigis(i)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/80"
                  >
                    x
                  </button>
                </div>
              ))}

              {(digiFiles.length + savedDigiUrls.length) < (config.digis?.max || 8) && (
                <button
                  type="button"
                  onClick={() => digiInputRef.current?.click()}
                  className="aspect-[3/4] rounded-lg border-2 border-dashed border-nice-border flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-xs">Add photo</span>
                </button>
              )}
            </div>

            <input
              ref={digiInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleDigis}
              className="hidden"
            />
          </div>
        )}

        {/* Portfolio */}
        {currentStepName === "portfolio" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Portfolio</h2>
              <p className="text-gray-400 text-sm">
                Portfolio photos are your best work from previous shoots, campaigns,
                or creative projects. These show us your range and how you look on
                camera in a professional setting.
              </p>
              <div className="mt-3 p-3 bg-nice-gray rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Good examples:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Photos from professional or creative shoots</li>
                  <li>• Campaign or editorial work</li>
                  <li>• Behind-the-scenes or test shoots</li>
                  <li>• Strong self-tapes or content you&apos;re proud of</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">
                  {config.portfolio?.required
                    ? "At least 1 photo required."
                    : "Don\u0027t have any yet? No worries — skip this step. Your digitals are what matter most."}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {config.portfolio?.required ? "Required" : "Optional"} • Up to {config.portfolio?.max || 10} photos
            </p>

            <div className="grid grid-cols-2 gap-3">
              {portfolioPreviews.map((preview, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-nice-gray">
                  <img
                    src={preview}
                    alt={`Portfolio ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePortfolio(i)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/80"
                  >
                    x
                  </button>
                </div>
              ))}

              {portfolioFiles.length < (config.portfolio?.max || 10) && (
                <button
                  type="button"
                  onClick={() => portfolioInputRef.current?.click()}
                  className="aspect-[3/4] rounded-lg border-2 border-dashed border-nice-border flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-xs">Add photo</span>
                </button>
              )}
            </div>

            <input
              ref={portfolioInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePortfolio}
              className="hidden"
            />
          </div>
        )}

        {/* Self Tape */}
        {currentStepName === "self_tape" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Self tape</h2>
              <p className="text-gray-400 text-sm">
                Paste a link to your self tape video. YouTube, Vimeo, Google Drive,
                or any shareable link works.
              </p>
              <div className="mt-3 p-3 bg-nice-gray rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1.5">What to include:</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>Introduce yourself — your name, age, and where you&apos;re based.</li>
                  <li>Tell us about your experience — any shoots, ads, or brands you&apos;ve worked with.</li>
                  <li>If you&apos;re newer to it, just tell us a bit about yourself and why you&apos;re keen.</li>
                </ol>
                <p className="text-xs text-gray-400 mt-2">
                  Make sure the link is set to public or &quot;anyone with the link&quot;.
                </p>
              </div>
            </div>

            <Input
              label="Video link"
              value={form.self_tape_url}
              onChange={(v) => updateForm("self_tape_url", v)}
              placeholder="https://..."
              required={config.self_tape?.required}
            />
          </div>
        )}

        {/* Experience */}
        {currentStepName === "experience" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Experience</h2>
              <p className="text-gray-400 text-sm">
                No experience needed — we just want to know where you&apos;re
                at.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Experience level
              </label>
              <div className="space-y-2">
                {[
                  { value: "none", label: "No experience — this is new for me" },
                  {
                    value: "some",
                    label: "A little — done a few shoots or projects",
                  },
                  {
                    value: "experienced",
                    label: "Experienced — regular work in modelling/acting",
                  },
                  {
                    value: "professional",
                    label: "Professional — this is my career",
                  },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateForm("experience_level", value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      form.experience_level === value
                        ? "bg-nice-black text-white border-nice-black"
                        : "border-nice-border text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Anything else we should know?
              </label>
              <textarea
                value={form.experience_notes}
                onChange={(e) =>
                  updateForm("experience_notes", e.target.value)
                }
                placeholder="Previous work, special skills, availability..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 resize-none"
              />
            </div>
          </div>
        )}

        </div>{/* end animate-fade-in */}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-full border border-nice-border text-sm font-medium hover:border-gray-400 transition-colors"
            >
              Back
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 py-3 rounded-full bg-nice-black text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black transition-colors"
            >
              {getButtonLabel()}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-full bg-nice-black text-white text-sm font-medium disabled:opacity-50 hover:bg-black transition-colors"
            >
              {submitting ? (submitProgress || "Submitting...") : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-700">
        {label}
        {required && <span className="text-gray-300 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
      />
    </div>
  );
}

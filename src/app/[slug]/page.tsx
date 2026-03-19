"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface AssetConfig {
  digis: { enabled: boolean; required: boolean; min: number; max: number };
  portfolio: { enabled: boolean; required: boolean; max: number };
  self_tape: { enabled: boolean; required: boolean };
}

interface JobInfo {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  asset_config: AssetConfig;
}

const DEFAULT_ASSET_CONFIG: AssetConfig = {
  digis: { enabled: true, required: true, min: 4, max: 8 },
  portfolio: { enabled: true, required: false, max: 10 },
  self_tape: { enabled: false, required: false },
};

export default function SubmissionForm() {
  const { slug } = useParams();
  const [job, setJob] = useState<JobInfo | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState("");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const digiInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

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

  const config = job?.asset_config || DEFAULT_ASSET_CONFIG;

  // Build dynamic steps based on asset config
  // Always: 1=About, 2=Measurements, then conditional asset steps, then Experience
  const steps = useMemo(() => {
    const s: string[] = ["about", "measurements"];
    if (config.digis?.enabled) s.push("digis");
    if (config.portfolio?.enabled) s.push("portfolio");
    if (config.self_tape?.enabled) s.push("self_tape");
    s.push("experience");
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
    const newFiles = [...digiFiles, ...files].slice(0, max);
    setDigiFiles(newFiles);
    setDigiPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeDigis = (index: number) => {
    setDigiFiles((prev) => prev.filter((_, i) => i !== index));
    setDigiPreviews((prev) => prev.filter((_, i) => i !== index));
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
    if (currentStepName === "about") return form.first_name && form.last_name && form.email;
    if (currentStepName === "measurements") return true;
    if (currentStepName === "digis") {
      if (config.digis?.required) {
        return digiFiles.length >= (config.digis?.min || 1);
      }
      return true;
    }
    if (currentStepName === "portfolio") return true; // always optional to skip
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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("job_slug", slug as string);

    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    digiFiles.forEach((file) => {
      formData.append("digis", file);
    });

    portfolioFiles.forEach((file) => {
      formData.append("portfolio", file);
    });

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }

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
        {/* Job info banner - only on step 1 */}
        {step === 1 && job && (
          <div className="mb-8 pb-6 border-b border-nice-border">
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            {job.description && (
              <p className="text-gray-500 text-sm mt-2">{job.description}</p>
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

            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(v) => updateForm("phone", v)}
            />

            <Input
              label="Instagram handle"
              value={form.instagram}
              onChange={(v) => updateForm("instagram", v)}
              placeholder="@"
            />

            <Input
              label="Date of birth"
              type="date"
              value={form.date_of_birth}
              onChange={(v) => updateForm("date_of_birth", v)}
            />

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
          </div>
        )}

        {/* Measurements */}
        {currentStepName === "measurements" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Measurements</h2>
              <p className="text-gray-400 text-sm">
                Approximate is fine — no need to be exact.
              </p>
            </div>

            <Input
              label="Height (cm)"
              type="number"
              value={form.height_cm}
              onChange={(v) => updateForm("height_cm", v)}
              placeholder="e.g. 175"
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Bust (cm)"
                type="number"
                value={form.bust_cm}
                onChange={(v) => updateForm("bust_cm", v)}
              />
              <Input
                label="Waist (cm)"
                type="number"
                value={form.waist_cm}
                onChange={(v) => updateForm("waist_cm", v)}
              />
              <Input
                label="Hips (cm)"
                type="number"
                value={form.hips_cm}
                onChange={(v) => updateForm("hips_cm", v)}
              />
            </div>

            <Input
              label="Shoe size (AU)"
              value={form.shoe_size}
              onChange={(v) => updateForm("shoe_size", v)}
              placeholder="e.g. 9"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hair colour"
                value={form.hair_color}
                onChange={(v) => updateForm("hair_color", v)}
                placeholder="e.g. Brown"
              />
              <Input
                label="Eye colour"
                value={form.eye_color}
                onChange={(v) => updateForm("eye_color", v)}
                placeholder="e.g. Blue"
              />
            </div>
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

              {digiFiles.length < (config.digis?.max || 8) && (
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
                <p className="text-xs text-gray-500 font-medium mb-1.5">Tips:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Make sure the link is set to public or &quot;anyone with the link&quot;</li>
                  <li>• Keep it under 2 minutes</li>
                  <li>• Good lighting and clear audio</li>
                </ul>
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
              {submitting ? "Submitting..." : "Submit application"}
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

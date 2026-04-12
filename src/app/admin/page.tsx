"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface AssetConfig {
  digis: { enabled: boolean; required: boolean; min: number; max: number };
  portfolio: { enabled: boolean; required: boolean; max: number };
  self_tape: { enabled: boolean; required: boolean };
  measurements: {
    enabled: boolean;
    fields: {
      height_cm: FieldConfig;
      bust_cm: FieldConfig;
      waist_cm: FieldConfig;
      hips_cm: FieldConfig;
      shoe_size: FieldConfig;
      hair_color: FieldConfig;
      eye_color: FieldConfig;
    };
  };
  about: {
    fields: {
      phone: FieldConfig;
      instagram: FieldConfig;
      date_of_birth: FieldConfig;
      gender: FieldConfig;
    };
  };
  experience: { enabled: boolean };
}

const f = (enabled = true, required = false): FieldConfig => ({ enabled, required });

const DEFAULT_ASSET_CONFIG: AssetConfig = {
  digis: { enabled: true, required: true, min: 4, max: 8 },
  portfolio: { enabled: true, required: false, max: 10 },
  self_tape: { enabled: false, required: false },
  measurements: {
    enabled: true,
    fields: { height_cm: f(), bust_cm: f(), waist_cm: f(), hips_cm: f(), shoe_size: f(), hair_color: f(), eye_color: f() },
  },
  about: {
    fields: { phone: f(), instagram: f(), date_of_birth: f(), gender: f() },
  },
  experience: { enabled: true },
};

// Normalize a field value - handles backward compat with old boolean format
function normalizeField(val: unknown, def: FieldConfig): FieldConfig {
  if (typeof val === "boolean") return { enabled: val, required: false };
  if (val && typeof val === "object") return { enabled: (val as FieldConfig).enabled ?? def.enabled, required: (val as FieldConfig).required ?? def.required };
  return def;
}

// Merge partial config from DB with defaults for backward compat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeConfig(raw: any): AssetConfig {
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
}

interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  type: string;
  asset_config: AssetConfig;
  shoot_date: string | null;
  brief_url: string | null;
  created_at: string;
  submissions: { count: number }[];
}

type SortKey = "newest" | "oldest" | "title" | "submissions";

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobType, setNewJobType] = useState<"casting" | "registration">("casting");
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newShootDate, setNewShootDate] = useState("");
  const [newAssetConfig, setNewAssetConfig] = useState<AssetConfig>(DEFAULT_ASSET_CONFIG);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editShootDate, setEditShootDate] = useState("");
  const [editAssetConfig, setEditAssetConfig] = useState<AssetConfig>(DEFAULT_ASSET_CONFIG);
  const [newBriefFile, setNewBriefFile] = useState<File | null>(null);
  const [editBriefFile, setEditBriefFile] = useState<File | null>(null);
  const [removeBrief, setRemoveBrief] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/admin/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleLogin = async () => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setAuthed(true);
      fetchJobs();
    } else {
      setAuthError("Wrong password.");
    }
  };

  const createJob = async () => {
    if (!newJobTitle.trim()) return;
    setCreating(true);
    setCreateError("");

    try {
      const formData = new FormData();
      formData.append("title", newJobTitle);
      formData.append("type", newJobType);
      formData.append("description", newJobDesc);
      if (newShootDate) formData.append("shoot_date", newShootDate);
      formData.append("asset_config", JSON.stringify(newAssetConfig));
      if (newBriefFile) formData.append("brief", newBriefFile);

      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewJobTitle("");
        setNewJobType("casting");
        setNewJobDesc("");
        setNewShootDate("");
        setNewAssetConfig(DEFAULT_ASSET_CONFIG);
        setNewBriefFile(null);
        setShowNewJob(false);
        setCreateError("");
        fetchJobs();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || "Failed to create. Try a different title.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    }
    setCreating(false);
  };

  const updateJob = async () => {
    if (!editingJob || !editTitle.trim()) return;
    setEditError("");

    try {
      const formData = new FormData();
      formData.append("id", editingJob.id);
      formData.append("title", editTitle);
      formData.append("description", editDesc);
      formData.append("shoot_date", editShootDate || "");
      formData.append("asset_config", JSON.stringify(editAssetConfig));
      if (editBriefFile) formData.append("brief", editBriefFile);
      if (removeBrief) formData.append("remove_brief", "true");

      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        setEditingJob(null);
        setEditBriefFile(null);
        setRemoveBrief(false);
        setEditError("");
        fetchJobs();
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || "Failed to save changes.");
      }
    } catch {
      setEditError("Network error. Please try again.");
    }
  };

  const deleteJob = async (id: string) => {
    const res = await fetch("/api/admin/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setDeleteConfirm(null);
      fetchJobs();
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "submissions":
        return (b.submissions?.[0]?.count || 0) - (a.submissions?.[0]?.count || 0);
      default:
        return 0;
    }
  });

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <Image
          src="https://i.ibb.co/v2dbL7X/Group-9.png"
          alt="Nice People"
          width={48}
          height={48}
          className="mb-8"
          unoptimized
        />
        <div className="w-full max-w-sm space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Admin password"
            className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
          />
          {authError && (
            <p className="text-red-500 text-sm">{authError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-full bg-nice-black text-white text-sm font-medium hover:bg-black transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-nice-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://i.ibb.co/v2dbL7X/Group-9.png"
              alt="Nice People"
              width={32}
              height={32}
              unoptimized
            />
            <span className="text-sm font-medium text-gray-400">Casting</span>
          </div>
          <button
            onClick={() => { setShowNewJob(true); setCreateError(""); }}
            className="px-4 py-2 rounded-full bg-nice-black text-white text-sm font-medium hover:bg-black transition-colors"
          >
            + New callout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Casting callouts</h1>
          {jobs.length > 1 && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-sm px-3 py-2 rounded-lg border border-nice-border bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">A–Z</option>
              <option value="submissions">Most submissions</option>
            </select>
          )}
        </div>

        {/* New Job Modal */}
        {showNewJob && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold">{newJobType === "registration" ? "New talent registration" : "New casting callout"}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewJobType("casting")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${newJobType === "casting" ? "bg-nice-black text-white" : "border border-nice-border text-gray-500 hover:border-gray-400"}`}
                >
                  Casting
                </button>
                <button
                  onClick={() => setNewJobType("registration")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${newJobType === "registration" ? "bg-nice-black text-white" : "border border-nice-border text-gray-500 hover:border-gray-400"}`}
                >
                  Registration
                </button>
              </div>
              <input
                type="text"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder={newJobType === "registration" ? "e.g. Jane Smith" : "e.g. Summer Campaign 2026"}
                className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
              />
              {newJobType === "casting" && (
                <>
                  <textarea
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    placeholder="Brief description (shown to applicants)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 resize-none"
                  />
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-500">Shoot date</label>
                    <input
                      type="date"
                      value={newShootDate}
                      onChange={(e) => setNewShootDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-500">Shoot brief (PDF)</label>
                    {newBriefFile ? (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-nice-border bg-gray-50">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm6-10a1 1 0 011 1v4a1 1 0 01-2 0V9a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                        </svg>
                        <span className="text-sm text-gray-600 truncate flex-1">{newBriefFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewBriefFile(null)}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="block w-full px-4 py-3 rounded-lg border border-dashed border-nice-border text-sm text-gray-400 text-center cursor-pointer hover:border-gray-400 transition-colors">
                        Upload PDF
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setNewBriefFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <AssetConfigEditor
                    config={newAssetConfig}
                    onChange={setNewAssetConfig}
                  />
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewJob(false);
                    setNewAssetConfig(DEFAULT_ASSET_CONFIG);
                    setNewBriefFile(null);
                  }}
                  className="px-6 py-2.5 rounded-full border border-nice-border text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createJob}
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-full bg-nice-black text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
              {createError && (
                <p className="text-red-500 text-sm">{createError}</p>
              )}
            </div>
          </div>
        )}

        {/* Edit Job Modal */}
        {editingJob && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold">Edit callout</h2>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Brief description (shown to applicants)"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 resize-none"
              />
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-500">Shoot date</label>
                <input
                  type="date"
                  value={editShootDate}
                  onChange={(e) => setEditShootDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-500">Shoot brief (PDF)</label>
                {editBriefFile ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-nice-border bg-gray-50">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm6-10a1 1 0 011 1v4a1 1 0 01-2 0V9a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span className="text-sm text-gray-600 truncate flex-1">{editBriefFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setEditBriefFile(null)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : editingJob?.brief_url && !removeBrief ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-nice-border bg-gray-50">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm6-10a1 1 0 011 1v4a1 1 0 01-2 0V9a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <a href={editingJob.brief_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-700 truncate flex-1">
                      View current brief
                    </a>
                    <button
                      type="button"
                      onClick={() => setRemoveBrief(true)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="block w-full px-4 py-3 rounded-lg border border-dashed border-nice-border text-sm text-gray-400 text-center cursor-pointer hover:border-gray-400 transition-colors">
                    {removeBrief ? "Upload new PDF" : "Upload PDF"}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        setEditBriefFile(e.target.files?.[0] || null);
                        setRemoveBrief(false);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <AssetConfigEditor
                config={editAssetConfig}
                onChange={setEditAssetConfig}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingJob(null);
                    setEditBriefFile(null);
                    setRemoveBrief(false);
                  }}
                  className="px-6 py-2.5 rounded-full border border-nice-border text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateJob}
                  className="flex-1 py-2.5 rounded-full bg-nice-black text-white text-sm font-medium hover:bg-black transition-colors"
                >
                  Save
                </button>
              </div>
              {editError && (
                <p className="text-red-500 text-sm">{editError}</p>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-semibold">Delete callout?</h2>
              <p className="text-sm text-gray-500">
                This will permanently delete the callout and all its submissions. This can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-2.5 rounded-full border border-nice-border text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteJob(deleteConfirm)}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">No callouts yet</p>
            <p className="text-sm">
              Create your first casting callout to start receiving submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedJobs.map((job) => {
              const count = job.submissions?.[0]?.count || 0;
              const config = mergeConfig(job.asset_config);
              const assetTags = [
                config.digis?.enabled && "Digis",
                config.portfolio?.enabled && "Portfolio",
                config.self_tape?.enabled && "Self tape",
                job.brief_url && "Brief",
              ].filter(Boolean);

              return (
                <div
                  key={job.id}
                  className="relative p-5 rounded-xl border border-nice-border hover:border-gray-300 transition-colors"
                >
                  <a
                    href={`/admin/${job.id}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {job.title}
                          {job.type === "registration" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Registration</span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          /{job.slug}
                          {job.shoot_date && (
                            <span className="ml-2">
                              · Shoot: {new Date(job.shoot_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </p>
                        {assetTags.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {assetTags.map((tag) => (
                              <span key={tag as string} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 pr-8">
                        <span className="text-sm text-gray-500">
                          {count} submission{count !== 1 ? "s" : ""}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            job.status === "open"
                              ? "bg-green-50 text-green-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://casting.nicepeople.au/${job.slug}`);
                      setCopiedSlug(job.id);
                      setTimeout(() => setCopiedSlug(null), 2000);
                    }}
                    className="mt-2 ml-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-nice-border text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {copiedSlug === job.id ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Copy link
                      </>
                    )}
                  </button>
                  {/* Three-dot menu */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(menuOpen === job.id ? null : job.id);
                    }}
                    className="absolute top-5 right-5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>
                  {menuOpen === job.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute top-12 right-5 z-50 bg-white rounded-xl border border-nice-border shadow-lg py-1 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingJob(job);
                            setEditTitle(job.title);
                            setEditDesc(job.description);
                            setEditShootDate(job.shoot_date || "");
                            setEditAssetConfig(mergeConfig(job.asset_config));
                            setMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteConfirm(job.id);
                            setMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
        on ? "bg-nice-black" : "bg-gray-200"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function FieldToggle({ label, field, onToggle, onRequiredToggle }: { label: string; field: FieldConfig; onToggle: () => void; onRequiredToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-xs ${field.enabled ? "text-gray-500" : "text-gray-300"}`}>{label}</span>
      <div className="flex items-center gap-2.5">
        {field.enabled && (
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={onRequiredToggle}
              className="rounded w-3 h-3"
            />
            <span className="text-[10px] text-gray-400">Req</span>
          </label>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={`w-7 h-4 rounded-full transition-colors relative flex-shrink-0 ${
            field.enabled ? "bg-nice-black" : "bg-gray-200"
          }`}
        >
          <div
            className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
              field.enabled ? "translate-x-3" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function AssetConfigEditor({
  config,
  onChange,
}: {
  config: AssetConfig;
  onChange: (config: AssetConfig) => void;
}) {
  return (
    <div className="border-t border-nice-border pt-4 space-y-4">
      {/* About You fields */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">About You fields</h3>
        <div className="p-3 rounded-lg border border-nice-border space-y-1">
          <p className="text-xs text-gray-400 mb-2">Name and email are always required</p>
          <FieldToggle
            label="Phone"
            field={config.about.fields.phone}
            onToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, phone: { ...config.about.fields.phone, enabled: !config.about.fields.phone.enabled } } } })}
            onRequiredToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, phone: { ...config.about.fields.phone, required: !config.about.fields.phone.required } } } })}
          />
          <FieldToggle
            label="Instagram"
            field={config.about.fields.instagram}
            onToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, instagram: { ...config.about.fields.instagram, enabled: !config.about.fields.instagram.enabled } } } })}
            onRequiredToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, instagram: { ...config.about.fields.instagram, required: !config.about.fields.instagram.required } } } })}
          />
          <FieldToggle
            label="Date of birth"
            field={config.about.fields.date_of_birth}
            onToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, date_of_birth: { ...config.about.fields.date_of_birth, enabled: !config.about.fields.date_of_birth.enabled } } } })}
            onRequiredToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, date_of_birth: { ...config.about.fields.date_of_birth, required: !config.about.fields.date_of_birth.required } } } })}
          />
          <FieldToggle
            label="Gender"
            field={config.about.fields.gender}
            onToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, gender: { ...config.about.fields.gender, enabled: !config.about.fields.gender.enabled } } } })}
            onRequiredToggle={() => onChange({ ...config, about: { ...config.about, fields: { ...config.about.fields, gender: { ...config.about.fields.gender, required: !config.about.fields.gender.required } } } })}
          />
        </div>
      </div>

      {/* Measurements */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Form sections</h3>
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-nice-border">
            <div className="flex items-center gap-2">
              <Toggle
                on={config.measurements.enabled}
                onToggle={() => onChange({ ...config, measurements: { ...config.measurements, enabled: !config.measurements.enabled } })}
              />
              <span className="text-sm font-medium">Measurements</span>
            </div>
            {config.measurements.enabled && (
              <div className="mt-2 pl-11 space-y-1">
                <FieldToggle
                  label="Height"
                  field={config.measurements.fields.height_cm}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, height_cm: { ...config.measurements.fields.height_cm, enabled: !config.measurements.fields.height_cm.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, height_cm: { ...config.measurements.fields.height_cm, required: !config.measurements.fields.height_cm.required } } } })}
                />
                <FieldToggle
                  label="Bust"
                  field={config.measurements.fields.bust_cm}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, bust_cm: { ...config.measurements.fields.bust_cm, enabled: !config.measurements.fields.bust_cm.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, bust_cm: { ...config.measurements.fields.bust_cm, required: !config.measurements.fields.bust_cm.required } } } })}
                />
                <FieldToggle
                  label="Waist"
                  field={config.measurements.fields.waist_cm}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, waist_cm: { ...config.measurements.fields.waist_cm, enabled: !config.measurements.fields.waist_cm.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, waist_cm: { ...config.measurements.fields.waist_cm, required: !config.measurements.fields.waist_cm.required } } } })}
                />
                <FieldToggle
                  label="Hips"
                  field={config.measurements.fields.hips_cm}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, hips_cm: { ...config.measurements.fields.hips_cm, enabled: !config.measurements.fields.hips_cm.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, hips_cm: { ...config.measurements.fields.hips_cm, required: !config.measurements.fields.hips_cm.required } } } })}
                />
                <FieldToggle
                  label="Shoe size"
                  field={config.measurements.fields.shoe_size}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, shoe_size: { ...config.measurements.fields.shoe_size, enabled: !config.measurements.fields.shoe_size.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, shoe_size: { ...config.measurements.fields.shoe_size, required: !config.measurements.fields.shoe_size.required } } } })}
                />
                <FieldToggle
                  label="Hair colour"
                  field={config.measurements.fields.hair_color}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, hair_color: { ...config.measurements.fields.hair_color, enabled: !config.measurements.fields.hair_color.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, hair_color: { ...config.measurements.fields.hair_color, required: !config.measurements.fields.hair_color.required } } } })}
                />
                <FieldToggle
                  label="Eye colour"
                  field={config.measurements.fields.eye_color}
                  onToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, eye_color: { ...config.measurements.fields.eye_color, enabled: !config.measurements.fields.eye_color.enabled } } } })}
                  onRequiredToggle={() => onChange({ ...config, measurements: { ...config.measurements, fields: { ...config.measurements.fields, eye_color: { ...config.measurements.fields.eye_color, required: !config.measurements.fields.eye_color.required } } } })}
                />
              </div>
            )}
          </div>

          {/* Digis */}
          <div className="p-3 rounded-lg border border-nice-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Toggle
                  on={config.digis.enabled}
                  onToggle={() => onChange({ ...config, digis: { ...config.digis, enabled: !config.digis.enabled } })}
                />
                <span className="text-sm font-medium">Digitals</span>
              </div>
              {config.digis.enabled && (
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={config.digis.required}
                    onChange={(e) => onChange({ ...config, digis: { ...config.digis, required: e.target.checked } })}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-500">Required</span>
                </label>
              )}
            </div>
            {config.digis.enabled && (
              <div className="flex gap-3 mt-2 pl-11">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Min</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.digis.min}
                    onChange={(e) => onChange({ ...config, digis: { ...config.digis, min: parseInt(e.target.value) || 1 } })}
                    className="w-14 px-2 py-1 rounded border border-nice-border text-xs text-center focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Max</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.digis.max}
                    onChange={(e) => onChange({ ...config, digis: { ...config.digis, max: parseInt(e.target.value) || 8 } })}
                    className="w-14 px-2 py-1 rounded border border-nice-border text-xs text-center focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Portfolio */}
          <div className="p-3 rounded-lg border border-nice-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Toggle
                  on={config.portfolio.enabled}
                  onToggle={() => onChange({ ...config, portfolio: { ...config.portfolio, enabled: !config.portfolio.enabled } })}
                />
                <span className="text-sm font-medium">Portfolio</span>
              </div>
              {config.portfolio.enabled && (
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={config.portfolio.required}
                    onChange={(e) => onChange({ ...config, portfolio: { ...config.portfolio, required: e.target.checked } })}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-500">Required</span>
                </label>
              )}
            </div>
            {config.portfolio.enabled && (
              <div className="flex gap-3 mt-2 pl-11">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Max</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.portfolio.max}
                    onChange={(e) => onChange({ ...config, portfolio: { ...config.portfolio, max: parseInt(e.target.value) || 10 } })}
                    className="w-14 px-2 py-1 rounded border border-nice-border text-xs text-center focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Self Tape */}
          <div className="p-3 rounded-lg border border-nice-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Toggle
                  on={config.self_tape.enabled}
                  onToggle={() => onChange({ ...config, self_tape: { ...config.self_tape, enabled: !config.self_tape.enabled } })}
                />
                <span className="text-sm font-medium">Self tape</span>
              </div>
              {config.self_tape.enabled && (
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={config.self_tape.required}
                    onChange={(e) => onChange({ ...config, self_tape: { ...config.self_tape, required: e.target.checked } })}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-500">Required</span>
                </label>
              )}
            </div>
            {config.self_tape.enabled && (
              <p className="text-xs text-gray-400 mt-2 pl-11">
                Applicants will paste a link (YouTube, Vimeo, Google Drive, etc.)
              </p>
            )}
          </div>

          {/* Experience */}
          <div className="p-3 rounded-lg border border-nice-border">
            <div className="flex items-center gap-2">
              <Toggle
                on={config.experience.enabled}
                onToggle={() => onChange({ ...config, experience: { enabled: !config.experience.enabled } })}
              />
              <span className="text-sm font-medium">Experience</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

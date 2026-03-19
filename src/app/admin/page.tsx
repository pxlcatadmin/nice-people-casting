"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface AssetConfig {
  digis: { enabled: boolean; required: boolean; min: number; max: number };
  portfolio: { enabled: boolean; required: boolean; max: number };
  self_tape: { enabled: boolean; required: boolean };
}

const DEFAULT_ASSET_CONFIG: AssetConfig = {
  digis: { enabled: true, required: true, min: 4, max: 8 },
  portfolio: { enabled: true, required: false, max: 10 },
  self_tape: { enabled: false, required: false },
};

interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  asset_config: AssetConfig;
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
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newAssetConfig, setNewAssetConfig] = useState<AssetConfig>(DEFAULT_ASSET_CONFIG);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssetConfig, setEditAssetConfig] = useState<AssetConfig>(DEFAULT_ASSET_CONFIG);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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

    const res = await fetch("/api/admin/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newJobTitle,
        description: newJobDesc,
        asset_config: newAssetConfig,
      }),
    });

    if (res.ok) {
      setNewJobTitle("");
      setNewJobDesc("");
      setNewAssetConfig(DEFAULT_ASSET_CONFIG);
      setShowNewJob(false);
      fetchJobs();
    }
  };

  const updateJob = async () => {
    if (!editingJob || !editTitle.trim()) return;

    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingJob.id,
        title: editTitle,
        description: editDesc,
        asset_config: editAssetConfig,
      }),
    });

    if (res.ok) {
      setEditingJob(null);
      fetchJobs();
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
            onClick={() => setShowNewJob(true)}
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
              <h2 className="text-lg font-semibold">New casting callout</h2>
              <input
                type="text"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder="e.g. Summer Campaign 2026"
                className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400"
              />
              <textarea
                value={newJobDesc}
                onChange={(e) => setNewJobDesc(e.target.value)}
                placeholder="Brief description (shown to applicants)"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 resize-none"
              />

              <AssetConfigEditor
                config={newAssetConfig}
                onChange={setNewAssetConfig}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewJob(false);
                    setNewAssetConfig(DEFAULT_ASSET_CONFIG);
                  }}
                  className="px-6 py-2.5 rounded-full border border-nice-border text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createJob}
                  className="flex-1 py-2.5 rounded-full bg-nice-black text-white text-sm font-medium hover:bg-black transition-colors"
                >
                  Create
                </button>
              </div>
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

              <AssetConfigEditor
                config={editAssetConfig}
                onChange={setEditAssetConfig}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingJob(null)}
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
              const config = job.asset_config || DEFAULT_ASSET_CONFIG;
              const assetTags = [
                config.digis?.enabled && "Digis",
                config.portfolio?.enabled && "Portfolio",
                config.self_tape?.enabled && "Self tape",
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
                        <h3 className="font-medium">{job.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          /{job.slug}
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
                            setEditAssetConfig(job.asset_config || DEFAULT_ASSET_CONFIG);
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

function AssetConfigEditor({
  config,
  onChange,
}: {
  config: AssetConfig;
  onChange: (config: AssetConfig) => void;
}) {
  return (
    <div className="border-t border-nice-border pt-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">What do applicants need to submit?</h3>
      <div className="space-y-3">
        {/* Digis */}
        <div className="p-3 rounded-lg border border-nice-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...config,
                    digis: { ...config.digis, enabled: !config.digis.enabled },
                  })
                }
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  config.digis.enabled ? "bg-nice-black" : "bg-gray-200"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                    config.digis.enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">Digitals</span>
            </div>
            {config.digis.enabled && (
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={config.digis.required}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      digis: { ...config.digis, required: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-xs text-gray-500">Required</span>
              </label>
            )}
          </div>
          {config.digis.enabled && (
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Min</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.digis.min}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      digis: { ...config.digis, min: parseInt(e.target.value) || 1 },
                    })
                  }
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
                  onChange={(e) =>
                    onChange({
                      ...config,
                      digis: { ...config.digis, max: parseInt(e.target.value) || 8 },
                    })
                  }
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
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...config,
                    portfolio: { ...config.portfolio, enabled: !config.portfolio.enabled },
                  })
                }
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  config.portfolio.enabled ? "bg-nice-black" : "bg-gray-200"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                    config.portfolio.enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">Portfolio</span>
            </div>
            {config.portfolio.enabled && (
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={config.portfolio.required}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      portfolio: { ...config.portfolio, required: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-xs text-gray-500">Required</span>
              </label>
            )}
          </div>
          {config.portfolio.enabled && (
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Max</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.portfolio.max}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      portfolio: { ...config.portfolio, max: parseInt(e.target.value) || 10 },
                    })
                  }
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
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...config,
                    self_tape: { ...config.self_tape, enabled: !config.self_tape.enabled },
                  })
                }
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  config.self_tape.enabled ? "bg-nice-black" : "bg-gray-200"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                    config.self_tape.enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">Self tape</span>
            </div>
            {config.self_tape.enabled && (
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={config.self_tape.required}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      self_tape: { ...config.self_tape, required: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-xs text-gray-500">Required</span>
              </label>
            )}
          </div>
          {config.self_tape.enabled && (
            <p className="text-xs text-gray-400 mt-2">
              Applicants will paste a link (YouTube, Vimeo, Google Drive, etc.)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

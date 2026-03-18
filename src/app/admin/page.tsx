"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  created_at: string;
  submissions: { count: number }[];
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDesc, setNewJobDesc] = useState("");

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
      body: JSON.stringify({ title: newJobTitle, description: newJobDesc }),
    });

    if (res.ok) {
      setNewJobTitle("");
      setNewJobDesc("");
      setShowNewJob(false);
      fetchJobs();
    }
  };

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
        <h1 className="text-2xl font-semibold mb-6">Casting callouts</h1>

        {/* New Job Modal */}
        {showNewJob && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
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
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewJob(false)}
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
            {jobs.map((job) => {
              const count = job.submissions?.[0]?.count || 0;
              return (
                <a
                  key={job.id}
                  href={`/admin/${job.id}`}
                  className="block p-5 rounded-xl border border-nice-border hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{job.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        /{job.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

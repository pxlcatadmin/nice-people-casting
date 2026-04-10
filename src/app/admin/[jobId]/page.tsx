"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

interface Submission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  instagram: string;
  date_of_birth: string;
  gender: string;
  height_cm: number | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  shoe_size: string;
  hair_color: string;
  eye_color: string;
  experience_level: string;
  experience_notes: string;
  digis: string[];
  portfolio: string[];
  photos: string[];
  self_tape_url: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

interface AssetConfig {
  digis: { enabled: boolean; required: boolean; min: number; max: number };
  portfolio: { enabled: boolean; required: boolean; max: number };
  self_tape: { enabled: boolean; required: boolean };
}

interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  asset_config: AssetConfig;
}

type ViewMode = "slideshow" | "grid" | "table";
type PhotoTab = "digis" | "portfolio" | "all";

export default function JobReview() {
  const { jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filtered, setFiltered] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [photoTab, setPhotoTab] = useState<PhotoTab>("digis");
  const [viewMode, setViewMode] = useState<ViewMode>("slideshow");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinks, setShareLinks] = useState<{ id: string; token: string; client_name: string; is_active: boolean; allow_selections: boolean; selection_count: number; created_at: string }[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newAllowSelections, setNewAllowSelections] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  const fetchJob = useCallback(async () => {
    const res = await fetch("/api/admin/jobs");
    if (res.ok) {
      const jobs = await res.json();
      const found = jobs.find((j: Job) => j.id === jobId);
      if (found) setJob(found);
    }
  }, [jobId]);

  const fetchSubmissions = useCallback(async () => {
    const res = await fetch(`/api/admin/submissions?job_id=${jobId}`);
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data);
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    fetchJob();
    fetchSubmissions();
  }, [fetchJob, fetchSubmissions]);

  const prevFilterRef = useRef(filterStatus);
  useEffect(() => {
    if (filterStatus === "all") {
      setFiltered(submissions);
    } else {
      setFiltered(submissions.filter((s) => s.status === filterStatus));
    }
    // Only reset position when the filter changes, not when submissions update
    if (prevFilterRef.current !== filterStatus) {
      setCurrentIndex(0);
      setCurrentPhoto(0);
      prevFilterRef.current = filterStatus;
    }
  }, [submissions, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const updateNotes = async (id: string, admin_notes: string) => {
    await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, admin_notes }),
    });

    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, admin_notes } : s))
    );
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm("Delete this submission? This can't be undone.")) return;
    await fetch(`/api/admin/submissions?id=${id}`, { method: "DELETE" });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleJobStatus = async () => {
    if (!job) return;
    const newStatus = job.status === "open" ? "closed" : "open";
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, status: newStatus }),
    });
    if (res.ok) {
      setJob({ ...job, status: newStatus });
    }
  };

  const fetchShareLinks = async () => {
    const res = await fetch(`/api/admin/share-links?job_id=${jobId}`);
    if (res.ok) setShareLinks(await res.json());
  };

  const createShareLink = async () => {
    setCreatingLink(true);
    const res = await fetch("/api/admin/share-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, client_name: newClientName, allow_selections: newAllowSelections }),
    });
    if (res.ok) {
      setNewClientName("");
      setNewAllowSelections(true);
      await fetchShareLinks();
    }
    setCreatingLink(false);
  };

  const toggleShareLink = async (id: string, is_active: boolean) => {
    await fetch("/api/admin/share-links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    fetchShareLinks();
  };

  const deleteShareLink = async (id: string) => {
    if (!confirm("Delete this share link? The client will lose access.")) return;
    await fetch(`/api/admin/share-links?id=${id}`, { method: "DELETE" });
    fetchShareLinks();
  };

  const copyShareLink = (link: { id: string; token: string }) => {
    const url = `${window.location.origin}/s/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Get photos for the current tab
  const getPhotosForTab = (s: Submission): string[] => {
    if (photoTab === "digis") return s.digis || [];
    if (photoTab === "portfolio") return s.portfolio || [];
    return [...(s.digis || []), ...(s.portfolio || [])];
  };

  // Preload next submission's photos
  useEffect(() => {
    if (viewMode !== "slideshow" || !filtered[currentIndex + 1]) return;
    const next = filtered[currentIndex + 1];
    const photos = [...(next.digis || []), ...(next.portfolio || [])];
    photos.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [currentIndex, filtered, viewMode]);

  // Keyboard navigation for slideshow
  useEffect(() => {
    if (viewMode !== "slideshow") return;

    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1));
        setCurrentPhoto(0);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
        setCurrentPhoto(0);
      } else if (e.key === "s") {
        if (filtered[currentIndex]) {
          const cur = filtered[currentIndex];
          updateStatus(cur.id, cur.status === "shortlisted" ? "new" : "shortlisted");
        }
      } else if (e.key === "1") {
        setPhotoTab("digis");
        setCurrentPhoto(0);
      } else if (e.key === "2") {
        setPhotoTab("portfolio");
        setCurrentPhoto(0);
      } else if (e.key === "3") {
        setPhotoTab("all");
        setCurrentPhoto(0);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewMode, currentIndex, filtered]);

  // Swipe support for mobile photo navigation
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    // Only swipe if horizontal movement > vertical and > 50px
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentPhoto < currentPhotos.length - 1) {
        setCurrentPhoto((p) => p + 1);
      } else if (dx > 0 && currentPhoto > 0) {
        setCurrentPhoto((p) => p - 1);
      }
    }
    touchStart.current = null;
  };

  const exportCSV = () => {
    const headers = [
      "First Name", "Last Name", "Email", "Phone", "Instagram",
      "DOB", "Gender", "Height", "Bust", "Waist", "Hips",
      "Shoe Size", "Hair", "Eyes", "Experience", "Notes",
      "Status", "Admin Notes", "Digitals", "Portfolio", "Self Tape",
    ];

    const rows = submissions.map((s) => [
      s.first_name, s.last_name, s.email, s.phone, s.instagram,
      s.date_of_birth, s.gender, s.height_cm || "", s.bust_cm || "",
      s.waist_cm || "", s.hips_cm || "", s.shoe_size, s.hair_color,
      s.eye_color, s.experience_level, s.experience_notes, s.status,
      s.admin_notes,
      (s.digis || []).join(" | "),
      (s.portfolio || []).join(" | "),
      s.self_tape_url || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job?.slug || "submissions"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  const current = filtered[currentIndex];
  const currentPhotos = current ? getPhotosForTab(current) : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-nice-border sticky top-0 bg-white z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Top row: back, logo, title, status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => router.push("/admin")}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Image
                src="https://i.ibb.co/v2dbL7X/Group-9.png"
                alt="Nice People"
                width={28}
                height={28}
                unoptimized
                className="flex-shrink-0 hidden sm:block"
              />
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{job?.title}</span>
                <span className="text-xs text-gray-400">
                  {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                </span>
              </div>
              {job && (
                <button
                  onClick={toggleJobStatus}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 hidden sm:block ${
                    job.status === "open"
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {job.status === "open" ? "Open" : "Closed"} — click to {job.status === "open" ? "close" : "reopen"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 sm:px-3 py-1.5 rounded-lg border border-nice-border text-xs sm:text-sm focus:outline-none"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="shortlisted">Shortlisted</option>
              </select>

              <div className="flex border border-nice-border rounded-lg overflow-hidden">
                {(["slideshow", "grid", "table"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2 sm:px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      viewMode === mode
                        ? "bg-nice-black text-white"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {mode === "slideshow" ? (
                      <span className="sm:hidden">Slide</span>
                    ) : null}
                    <span className={mode === "slideshow" ? "hidden sm:inline" : ""}>{mode}</span>
                  </button>
                ))}
              </div>

              {submissions.some((s) => s.status === "shortlisted") && (
                <button
                  onClick={() => { setShowShareModal(true); fetchShareLinks(); }}
                  className="px-3 sm:px-4 py-1.5 rounded-lg border border-nice-border text-xs sm:text-sm font-medium hover:border-gray-400 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">Share shortlist</span>
                </button>
              )}
              <button
                onClick={exportCSV}
                className="px-3 sm:px-4 py-1.5 rounded-lg border border-nice-border text-xs sm:text-sm font-medium hover:border-gray-400 transition-colors hidden sm:block"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No submissions{filterStatus !== "all" ? ` with status "${filterStatus}"` : ""}.</p>
        </div>
      ) : viewMode === "slideshow" ? (
        /* ========== SLIDESHOW VIEW ========== */
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Desktop: side by side. Mobile: stacked */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-120px)]">
            {/* Photo Section */}
            <div className="flex-1 flex flex-col">
              {/* Photo tab switcher */}
              <div className="flex gap-1 mb-3">
                {(["digis", "portfolio", "all"] as PhotoTab[]).map((tab) => {
                  const count =
                    tab === "digis"
                      ? (current?.digis || []).length
                      : tab === "portfolio"
                      ? (current?.portfolio || []).length
                      : [...(current?.digis || []), ...(current?.portfolio || [])].length;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setPhotoTab(tab);
                        setCurrentPhoto(0);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        photoTab === tab
                          ? "bg-nice-black text-white"
                          : "text-gray-500 hover:bg-gray-50 border border-nice-border"
                      }`}
                    >
                      {tab === "all" ? "All" : tab} ({count})
                    </button>
                  );
                })}
              </div>

              {currentPhotos.length > 0 ? (
                <>
                  <div
                    className="relative rounded-xl overflow-hidden bg-nice-gray aspect-[3/4] sm:aspect-auto sm:flex-1"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      key={`${currentIndex}-${currentPhoto}`}
                      src={currentPhotos[currentPhoto]}
                      alt={`${current.first_name} ${current.last_name}`}
                      className="w-full h-full object-contain animate-fade-image"
                    />
                    {currentPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPhoto((p) => Math.max(0, p - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60"
                          disabled={currentPhoto === 0}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setCurrentPhoto((p) => Math.min(currentPhotos.length - 1, p + 1))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60"
                          disabled={currentPhoto === currentPhotos.length - 1}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                      {currentPhoto + 1} / {currentPhotos.length}
                    </div>
                  </div>
                  {currentPhotos.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
                      {currentPhotos.map((photo, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPhoto(i)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                            i === currentPhoto ? "border-nice-black" : "border-transparent"
                          }`}
                        >
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[3/4] sm:aspect-auto sm:flex-1 rounded-xl bg-nice-gray flex items-center justify-center text-gray-400">
                  No {photoTab === "all" ? "photos" : photoTab} uploaded
                </div>
              )}
            </div>

            {/* Details Panel */}
            <div className="lg:w-80 flex flex-col pb-8 lg:pb-0 lg:overflow-y-auto hide-scrollbar">
              {/* Navigation counter */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">
                  {currentIndex + 1} of {filtered.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setCurrentIndex((i) => Math.max(0, i - 1));
                      setCurrentPhoto(0);
                    }}
                    disabled={currentIndex === 0}
                    className="w-8 h-8 rounded-full border border-nice-border flex items-center justify-center text-gray-400 hover:border-gray-400 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentIndex((i) => Math.min(filtered.length - 1, i + 1));
                      setCurrentPhoto(0);
                    }}
                    disabled={currentIndex === filtered.length - 1}
                    className="w-8 h-8 rounded-full border border-nice-border flex items-center justify-center text-gray-400 hover:border-gray-400 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {current && (
                <>
                  <h2 className="text-xl font-semibold">
                    {current.first_name} {current.last_name}
                  </h2>
                  {current.instagram && (
                    <a
                      href={`https://instagram.com/${current.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 hover:text-gray-600 mt-1"
                    >
                      {current.instagram.startsWith("@") ? current.instagram : `@${current.instagram}`}
                    </a>
                  )}

                  {/* Shortlist Toggle */}
                  <button
                    onClick={() =>
                      updateStatus(
                        current.id,
                        current.status === "shortlisted" ? "new" : "shortlisted"
                      )
                    }
                    className={`mt-4 w-full py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      current.status === "shortlisted"
                        ? "bg-nice-green text-white shadow-[0_0_16px_rgba(34,197,94,0.4)]"
                        : "bg-nice-black text-white hover:bg-black"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={current.status === "shortlisted" ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                    {current.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
                  </button>

                  {/* Details - compact grid on mobile */}
                  <div className="mt-6 space-y-4 text-sm">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      <DetailSection title="Contact">
                        <DetailRow label="Email" value={current.email} />
                        <DetailRow label="Phone" value={current.phone} />
                        <DetailRow label="DOB" value={current.date_of_birth} />
                        <DetailRow label="Gender" value={current.gender} />
                      </DetailSection>

                      <DetailSection title="Measurements">
                        <DetailRow label="Height" value={current.height_cm ? `${current.height_cm}cm` : ""} />
                        <DetailRow label="Bust" value={current.bust_cm ? `${current.bust_cm}cm` : ""} />
                        <DetailRow label="Waist" value={current.waist_cm ? `${current.waist_cm}cm` : ""} />
                        <DetailRow label="Hips" value={current.hips_cm ? `${current.hips_cm}cm` : ""} />
                        <DetailRow label="Shoe" value={current.shoe_size} />
                        <DetailRow label="Hair" value={current.hair_color} />
                        <DetailRow label="Eyes" value={current.eye_color} />
                      </DetailSection>
                    </div>

                    <DetailSection title="Experience">
                      <DetailRow label="Level" value={current.experience_level} />
                      {current.experience_notes && (
                        <p className="text-gray-500 mt-1">{current.experience_notes}</p>
                      )}
                    </DetailSection>

                    {current.self_tape_url && (
                      <DetailSection title="Self Tape">
                        <a
                          href={current.self_tape_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 underline break-all"
                        >
                          View self tape
                        </a>
                      </DetailSection>
                    )}

                    <DetailSection title="Photos">
                      <DetailRow label="Digis" value={`${(current.digis || []).length} uploaded`} />
                      <DetailRow label="Portfolio" value={`${(current.portfolio || []).length} uploaded`} />
                    </DetailSection>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
                      <textarea
                        value={current.admin_notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubmissions((prev) =>
                            prev.map((s) =>
                              s.id === current.id ? { ...s, admin_notes: val } : s
                            )
                          );
                        }}
                        onBlur={() => updateNotes(current.id, current.admin_notes)}
                        placeholder="Add notes..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => deleteSubmission(current.id)}
                    className="mt-4 w-full py-2 rounded-lg text-xs text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete submission
                  </button>

                  <div className="mt-4 pt-4 border-t border-nice-border hidden lg:block">
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Keys: Arrow keys = navigate, S = toggle shortlist,
                      1 = digis, 2 = portfolio, 3 = all photos
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ========== GRID VIEW ========== */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setCurrentPhoto(0);
                  setViewMode("slideshow");
                }}
                className="group text-left"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-nice-gray relative">
                  {(s.digis || [])[0] ? (
                    <img
                      src={s.digis[0]}
                      alt={`${s.first_name} ${s.last_name}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (s.photos || [])[0] ? (
                    <img
                      src={s.photos[0]}
                      alt={`${s.first_name} ${s.last_name}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-light">
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                  )}
                  {s.status === "shortlisted" && (
                    <div className="absolute top-2 right-2 text-green-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium truncate">
                  {s.first_name} {s.last_name}
                </p>
                <p className="text-xs text-gray-400">
                  {s.height_cm ? `${s.height_cm}cm` : ""}
                  {s.instagram && ` · ${s.instagram}`}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {(s.digis || []).length}d / {(s.portfolio || []).length}p
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ========== TABLE VIEW ========== */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nice-border text-left">
                <th className="pb-3 font-medium text-gray-500">Name</th>
                <th className="pb-3 font-medium text-gray-500">Instagram</th>
                <th className="pb-3 font-medium text-gray-500">Height</th>
                <th className="pb-3 font-medium text-gray-500 hidden sm:table-cell">Measurements</th>
                <th className="pb-3 font-medium text-gray-500 hidden sm:table-cell">Experience</th>
                <th className="pb-3 font-medium text-gray-500">Digis</th>
                <th className="pb-3 font-medium text-gray-500 hidden sm:table-cell">Portfolio</th>
                <th className="pb-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr
                  key={s.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setCurrentPhoto(0);
                    setViewMode("slideshow");
                  }}
                  className="border-b border-nice-border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 font-medium">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="py-3 text-gray-500">{s.instagram}</td>
                  <td className="py-3 text-gray-500">
                    {s.height_cm ? `${s.height_cm}cm` : "-"}
                  </td>
                  <td className="py-3 text-gray-500 hidden sm:table-cell">
                    {[s.bust_cm && `B${s.bust_cm}`, s.waist_cm && `W${s.waist_cm}`, s.hips_cm && `H${s.hips_cm}`]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </td>
                  <td className="py-3 text-gray-500 capitalize hidden sm:table-cell">{s.experience_level}</td>
                  <td className="py-3 text-gray-500">{(s.digis || []).length}</td>
                  <td className="py-3 text-gray-500 hidden sm:table-cell">{(s.portfolio || []).length}</td>
                  <td className="py-3">
                    {s.status === "shortlisted" ? (
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Share Shortlist</h2>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Create new link */}
              <div className="mb-6 p-4 bg-nice-gray rounded-xl">
                <p className="text-sm text-gray-500 mb-3">Create a link to share your shortlisted talent with a client.</p>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name (optional)"
                  className="w-full px-3 py-2.5 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 mb-3"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAllowSelections}
                    onChange={(e) => setNewAllowSelections(e.target.checked)}
                    className="rounded"
                  />
                  Allow client to select favorites
                </label>
                <button
                  onClick={createShareLink}
                  disabled={creatingLink}
                  className="w-full py-2.5 rounded-full bg-nice-black text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {creatingLink ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : "Create Link"}
                </button>
              </div>

              {/* Existing links */}
              {shareLinks.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active links</p>
                  {shareLinks.map((link) => (
                    <div key={link.id} className={`p-4 rounded-xl border transition-colors ${link.is_active ? "border-nice-border" : "border-nice-border bg-gray-50 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{link.client_name || "Unnamed link"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${link.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                          {link.is_active ? "Active" : "Revoked"}
                        </span>
                      </div>
                      {link.selection_count > 0 && (
                        <p className="text-xs text-gray-400 mb-2">{link.selection_count} talent selected by client</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyShareLink(link)}
                          className="flex-1 py-1.5 rounded-lg border border-nice-border text-xs font-medium hover:border-gray-400 transition-colors"
                        >
                          {copiedLinkId === link.id ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          onClick={() => toggleShareLink(link.id, link.is_active)}
                          className="py-1.5 px-3 rounded-lg border border-nice-border text-xs font-medium hover:border-gray-400 transition-colors"
                        >
                          {link.is_active ? "Revoke" : "Reactivate"}
                        </button>
                        <button
                          onClick={() => deleteShareLink(link.id)}
                          className="py-1.5 px-3 rounded-lg text-xs text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

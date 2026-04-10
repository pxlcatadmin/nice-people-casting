"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface PublicSubmission {
  id: string;
  first_name: string;
  last_name: string;
  instagram: string;
  gender: string;
  height_cm: number | null;
  hair_color: string;
  eye_color: string;
  experience_level: string;
  experience_notes: string;
  photos: string[];
  self_tape_url: string;
  selected: boolean;
  selection_note: string;
}

interface ShareData {
  job: { title: string; description: string };
  submissions: PublicSubmission[];
  allow_selections: boolean;
  client_name: string;
}

export default function ClientLookbook() {
  const { token } = useParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/shortlist/${token}`);
        if (!res.ok) {
          const body = await res.json();
          setError(body.error || "not_found");
        } else {
          setData(await res.json());
        }
      } catch {
        setError("error");
      }
      setLoading(false);
    }
    fetchData();
  }, [token]);

  // Keyboard navigation in detail view
  useEffect(() => {
    if (activeIndex === null || !data) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => Math.min((i ?? 0) + 1, data.submissions.length - 1));
        setCurrentPhoto(0);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) => Math.max((i ?? 0) - 1, 0));
        setCurrentPhoto(0);
      } else if (e.key === "Escape") {
        setActiveIndex(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, data]);

  // Preload next submission photos
  useEffect(() => {
    if (activeIndex === null || !data) return;
    const next = data.submissions[activeIndex + 1];
    if (next) {
      next.photos.forEach((url) => {
        const img = new window.Image();
        img.src = url;
      });
    }
  }, [activeIndex, data]);

  const toggleSelection = useCallback(async (submissionId: string) => {
    if (!data?.allow_selections) return;
    const sub = data.submissions.find((s) => s.id === submissionId);
    if (!sub) return;

    const newSelected = !sub.selected;
    // Optimistic update
    setData((prev) => prev ? {
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId ? { ...s, selected: newSelected } : s
      ),
    } : prev);

    await fetch(`/api/shortlist/${token}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, selected: newSelected }),
    });
  }, [data, token]);

  const saveNote = useCallback(async (submissionId: string, note: string) => {
    await fetch(`/api/shortlist/${token}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, selected: true, note }),
    });
  }, [token]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent, photosLength: number) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentPhoto < photosLength - 1) {
        setCurrentPhoto((p) => p + 1);
      } else if (dx > 0 && currentPhoto > 0) {
        setCurrentPhoto((p) => p - 1);
      }
    }
    touchStart.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Image src="https://i.ibb.co/v2dbL7X/Group-9.png" alt="Nice People" width={40} height={40} unoptimized className="animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <Image src="https://i.ibb.co/v2dbL7X/Group-9.png" alt="Nice People" width={48} height={48} unoptimized className="mb-6" />
        <h1 className="text-xl font-semibold text-center mb-2">
          {error === "not_found" ? "Link not found" : "This link is no longer active"}
        </h1>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          Please contact the agency for an updated link.
        </p>
      </div>
    );
  }

  if (!data || data.submissions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <Image src="https://i.ibb.co/v2dbL7X/Group-9.png" alt="Nice People" width={48} height={48} unoptimized className="mb-6" />
        <h1 className="text-xl font-semibold text-center mb-2">No talent shortlisted yet</h1>
        <p className="text-gray-400 text-sm text-center max-w-xs">The agency is still reviewing submissions.</p>
      </div>
    );
  }

  const selectedCount = data.submissions.filter((s) => s.selected).length;
  const active = activeIndex !== null ? data.submissions[activeIndex] : null;

  // ========== DETAIL VIEW ==========
  if (active && activeIndex !== null) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-nice-border z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <button onClick={() => setActiveIndex(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="text-xs text-gray-400">{activeIndex + 1} of {data.submissions.length}</span>
            <div className="flex gap-1">
              <button
                onClick={() => { setActiveIndex(Math.max(0, activeIndex - 1)); setCurrentPhoto(0); }}
                disabled={activeIndex === 0}
                className="w-8 h-8 rounded-full border border-nice-border flex items-center justify-center text-gray-400 hover:border-gray-400 disabled:opacity-30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => { setActiveIndex(Math.min(data.submissions.length - 1, activeIndex + 1)); setCurrentPhoto(0); }}
                disabled={activeIndex === data.submissions.length - 1}
                className="w-8 h-8 rounded-full border border-nice-border flex items-center justify-center text-gray-400 hover:border-gray-400 disabled:opacity-30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            {/* Photos */}
            <div className="flex-1 flex flex-col">
              {active.photos.length > 0 ? (
                <>
                  <div
                    className="relative rounded-2xl overflow-hidden bg-nice-gray aspect-[3/4] sm:aspect-auto sm:flex-1"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, active.photos.length)}
                  >
                    <img
                      key={`${activeIndex}-${currentPhoto}`}
                      src={active.photos[currentPhoto]}
                      alt={`${active.first_name} ${active.last_name}`}
                      className="w-full h-full object-contain animate-fade-image"
                    />
                    {active.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPhoto((p) => Math.max(0, p - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors disabled:opacity-0"
                          disabled={currentPhoto === 0}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                          onClick={() => setCurrentPhoto((p) => Math.min(active.photos.length - 1, p + 1))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors disabled:opacity-0"
                          disabled={currentPhoto === active.photos.length - 1}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1 rounded-full">
                      {currentPhoto + 1} / {active.photos.length}
                    </div>
                  </div>
                  {active.photos.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
                      {active.photos.map((photo, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPhoto(i)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${i === currentPhoto ? "border-nice-black" : "border-transparent"}`}
                        >
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[3/4] rounded-2xl bg-nice-gray flex items-center justify-center text-gray-300 text-4xl font-light">
                  {active.first_name[0]}{active.last_name[0]}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="lg:w-80 space-y-6 pb-8">
              <div>
                <h1 className="text-2xl font-semibold">{active.first_name} {active.last_name}</h1>
                {active.instagram && (
                  <a
                    href={`https://instagram.com/${active.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-gray-600 mt-1 inline-block"
                  >
                    {active.instagram.startsWith("@") ? active.instagram : `@${active.instagram}`}
                  </a>
                )}
              </div>

              {/* Selection button */}
              {data.allow_selections && (
                <div>
                  <button
                    onClick={() => toggleSelection(active.id)}
                    className={`w-full py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      active.selected
                        ? "bg-nice-green text-white"
                        : "border border-nice-border text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <svg className="w-4 h-4" fill={active.selected ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {active.selected ? "Selected" : "Select"}
                  </button>
                  {active.selected && (
                    <textarea
                      defaultValue={active.selection_note}
                      onBlur={(e) => saveNote(active.id, e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="w-full mt-2 px-3 py-2 rounded-lg border border-nice-border text-sm focus:outline-none focus:border-gray-400 resize-none animate-fade-in"
                    />
                  )}
                </div>
              )}

              {/* Details grid */}
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {active.height_cm && <DetailPair label="Height" value={`${active.height_cm}cm`} />}
                  {active.gender && <DetailPair label="Gender" value={active.gender} />}
                  {active.hair_color && <DetailPair label="Hair" value={active.hair_color} />}
                  {active.eye_color && <DetailPair label="Eyes" value={active.eye_color} />}
                </div>

                {active.experience_level && active.experience_level !== "none" && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Experience</p>
                    <p className="text-gray-600 capitalize">{active.experience_level.replace("_", " ")}</p>
                    {active.experience_notes && (
                      <p className="text-gray-400 mt-1">{active.experience_notes}</p>
                    )}
                  </div>
                )}

                {active.self_tape_url && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Self Tape</p>
                    <a
                      href={active.self_tape_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nice-blue hover:underline text-sm"
                    >
                      Watch video
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== GRID VIEW ==========
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-nice-border z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Image src="https://i.ibb.co/v2dbL7X/Group-9.png" alt="Nice People" width={24} height={24} unoptimized />
          <span className="text-sm font-medium text-gray-700">{data.job.title}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {data.submissions.map((s, idx) => (
            <div
              key={s.id}
              className="group cursor-pointer"
              style={{ animationDelay: `${idx * 60}ms` }}
              onClick={() => { setActiveIndex(idx); setCurrentPhoto(0); }}
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-nice-gray animate-stagger-in">
                {s.photos[0] ? (
                  <img
                    src={s.photos[0]}
                    alt={`${s.first_name} ${s.last_name}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-light">
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                )}

                {/* Selection heart */}
                {data.allow_selections && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelection(s.id); }}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/50"
                  >
                    <svg
                      className={`w-5 h-5 transition-all ${s.selected ? "text-red-400 scale-110" : "text-white"}`}
                      fill={s.selected ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-3 px-1">
                <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[s.height_cm && `${s.height_cm}cm`, s.instagram && (s.instagram.startsWith("@") ? s.instagram : `@${s.instagram}`)].filter(Boolean).join(" - ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating selection counter */}
      {data.allow_selections && selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-nice-black text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg animate-fade-in z-30">
          {selectedCount} selected
        </div>
      )}
    </div>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-gray-700">{value}</p>
    </div>
  );
}

"use client";

interface VideoEmbedProps {
  url: string;
  className?: string;
  /** Max height as a Tailwind utility (e.g. "max-h-[70vh]"). Default scales to viewport. */
  maxHeightClass?: string;
}

function parseVideoUrl(url: string) {
  const trimmed = url.trim();

  // YouTube — covers watch?v=, youtu.be, embed/, shorts/, and live/
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: "youtube" as const,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/
  );
  if (vimeoMatch) {
    return {
      type: "vimeo" as const,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Google Drive
  const driveMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
    trimmed.match(/drive\.google\.com\/(?:open|uc)\?id=([^&]+)/);
  if (driveMatch) {
    return {
      type: "drive" as const,
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  // Direct video files
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(trimmed)) {
    return { type: "direct" as const, embedUrl: trimmed };
  }

  return { type: "unknown" as const, embedUrl: trimmed };
}

export default function VideoEmbed({
  url,
  className = "",
  maxHeightClass = "max-h-[75vh]",
}: VideoEmbedProps) {
  if (!url || !url.trim()) return null;

  const { type, embedUrl } = parseVideoUrl(url);

  if (type === "unknown") {
    return (
      <a
        href={embedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-black hover:underline break-all"
      >
        {embedUrl} →
      </a>
    );
  }

  // Direct video file — browser sizes to natural aspect ratio (portrait, landscape, square).
  if (type === "direct") {
    return (
      <div className={`flex items-center justify-center bg-black rounded-lg overflow-hidden ${className}`}>
        <video
          src={embedUrl}
          controls
          playsInline
          className={`${maxHeightClass} max-w-full w-auto h-auto`}
        />
      </div>
    );
  }

  // YouTube / Vimeo / Drive iframes — can't detect natural aspect of remote video.
  // Self-tapes are mostly portrait phone clips, so default to a 9:16 frame
  // capped at the viewport so it doesn't take over the screen.
  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden mx-auto aspect-[9/16] ${maxHeightClass} ${className}`}
      style={{ maxWidth: "min(100%, calc(75vh * 9 / 16))" }}
    >
      <iframe
        src={embedUrl}
        title="Self tape"
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

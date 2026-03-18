import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Nice People Casting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://i.ibb.co/v2dbL7X/Group-9.png"
          alt="Nice People"
          width={80}
          height={80}
          style={{ marginBottom: 24 }}
        />
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#111111",
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#999999",
          }}
        >
          Nice People Casting
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#666666",
            marginTop: 24,
            padding: "12px 32px",
            borderRadius: 100,
            backgroundColor: "#f5f5f5",
          }}
        >
          Apply Now
        </div>
      </div>
    ),
    { ...size }
  );
}

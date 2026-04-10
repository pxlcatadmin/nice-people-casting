import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Nice People - Casting Shortlist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          width={100}
          height={100}
          style={{ marginBottom: 28 }}
        />
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: "#111111",
            marginBottom: 12,
          }}
        >
          Nice People
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#999999",
          }}
        >
          Casting Shortlist
        </div>
      </div>
    ),
    { ...size }
  );
}

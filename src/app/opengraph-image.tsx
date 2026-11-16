import { ImageResponse } from "next/og";
import { SHARE_ALT } from "@/lib/seo";
export const alt = SHARE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 70,
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(120deg, #f1e8fe, #ffe4e8)",
        color: "#221c35",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            background: "#7c3aed",
            color: "white",
            fontSize: 60,
            fontWeight: 700,
          }}
        >
          P
        </div>
        <span style={{ fontSize: 52, fontWeight: 700 }}>Partiers</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 960,
          }}
        >
          Little guests. Big fun.
        </div>
        <div style={{ fontSize: 30, marginTop: 24, color: "#6b6280" }}>
          Games, crafts &amp; kids’ party activities
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
        }}
      >
        <span>Birthdays · playdates · family gatherings</span>
        <span style={{ color: "#7c3aed" }}>Plan your party</span>
      </div>
    </div>,
    size,
  );
}

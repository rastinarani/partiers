import { ImageResponse } from "next/og";

export function brandIcon(size: number) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#7c3aed",
        color: "white",
        fontSize: size * 0.72,
        fontWeight: 700,
        borderRadius: size * 0.22,
      }}
    >
      P
    </div>,
    { width: size, height: size },
  );
}

import { ImageResponse } from "next/og";
import { BRAND, MARK_DATA_URI } from "@/server/brand";

export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card people see when a Resonate link is pasted into Discord, iMessage, X… */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: BRAND.bg,
          backgroundImage: `radial-gradient(60% 80% at 100% 0%, ${BRAND.to}55, transparent 70%)`,
          color: BRAND.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_DATA_URI} width={72} height={72} alt="" />
          <div style={{ fontSize: 40, letterSpacing: -1 }}>{BRAND.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>
          <div>Every song on YouTube.</div>
          <div style={{ color: "#f5820a" }}>A player built for listening.</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Synced lyrics", "A real queue", "Crossfade", "Playlists that stay yours"].map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 999,
                background: "#1e1e1e",
                color: BRAND.textDim,
                fontSize: 26,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

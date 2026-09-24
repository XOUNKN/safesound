/**
 * Static brand values for places CSS variables can't reach: the favicon,
 * generated share images and the web manifest. Keep in sync with the "ember"
 * accent in globals.css and the mark in components/brand/Logo.tsx.
 */
export const BRAND = {
  name: "Resonate",
  tagline: "Every song on YouTube. A player built for listening.",
  description:
    "Search every song on YouTube and listen in a player built for music: synced lyrics, a real queue, crossfade, and playlists that stay yours. Free, nothing to install.",
  bg: "#0a0a0a",
  surface: "#121212",
  from: "#ffbe00",
  to: "#e85e0a",
  text: "#ffffff",
  textDim: "#a0a0a0",
} as const;

/** The Resonate mark as a standalone SVG string (no CSS variables). */
export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="g" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="${BRAND.from}"/><stop offset="1" stop-color="${BRAND.to}"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#g)"/><circle cx="14" cy="20" r="3.4" fill="${BRAND.bg}"/><path d="M20.4 13.6a9 9 0 0 1 0 12.8" stroke="${BRAND.bg}" stroke-width="2.4" stroke-linecap="round" opacity="0.95"/><path d="M25.6 10.4a14.4 14.4 0 0 1 0 19.2" stroke="${BRAND.bg}" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/><path d="M30.8 7.6a19.4 19.4 0 0 1 0 24.8" stroke="${BRAND.bg}" stroke-width="2.4" stroke-linecap="round" opacity="0.25"/></svg>`;

export const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`;

/**
 * Absolute origin used for canonical and share-preview URLs. Render sets
 * RENDER_EXTERNAL_URL automatically; SITE_URL overrides it (e.g. a custom domain).
 */
export function siteUrl(): URL {
  const raw = process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

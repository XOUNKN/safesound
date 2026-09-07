import type { Track } from "./types";

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "--:--";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

/** Screen-reader friendly duration, e.g. "3 minutes 42 seconds". */
export function spokenDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "unknown length";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 seconds";
}

export function formatTotalDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 min";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * YouTube music titles are usually "Artist - Song (Official Video)". We show
 * the raw title as the primary line (it is what the uploader chose) but strip
 * the noisiest suffixes so rows stay readable.
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([][^)\]]*\b(official|lyric|audio|video|visuali[sz]er|hd|4k|mv)\b[^)\]]*[)\]]/gi, "")
    .replace(/\s*[|｜]\s*official.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim() || title;
}

/** "Rick Astley - Topic" reads better as just "Rick Astley". */
export function cleanArtist(channelTitle: string): string {
  return channelTitle.replace(/\s*-\s*Topic$/i, "").trim() || channelTitle;
}

/**
 * Thumbnails always come straight from YouTube's own image CDN — we never
 * re-host or proxy them.
 */
export function thumbUrl(track: Pick<Track, "videoId" | "thumbnailUrl">, size: "sm" | "lg" = "sm"): string {
  if (track.thumbnailUrl) return track.thumbnailUrl;
  return `https://i.ytimg.com/vi/${track.videoId}/${size === "lg" ? "hqdefault" : "mqdefault"}.jpg`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

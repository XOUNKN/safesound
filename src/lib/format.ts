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

/* ------------------------- title & artist labels ------------------------ */

type Labelled = Pick<Track, "title" | "channelTitle">;

/** "(Official Video)", "[4K]", "(Lyric Video)"… anywhere in the title. */
const BRACKET_NOISE =
  /\s*[([][^)\]]*\b(official|lyrics?|audio|video|visuali[sz]er|hd|hq|4k|mv|m\/v)\b[^)\]]*[)\]]/gi;
/** Unbracketed trailing noise: `Song Official Music Video`, `Song | Official Audio`. */
const TRAILING_NOISE =
  /\s*[-–—|｜]?\s*\b(official\s+(music\s+)?(video|audio|visuali[sz]er|lyric\s+video)|lyric\s+video|music\s+video)\s*$/i;
/** "Song - Remastered 2011" is a version tag, not "Artist - Song". */
const VERSION_TAG =
  /^(\d{4}\s+)?(remaster|live\b|acoustic|demo|mono|stereo|single|radio|extended|edit\b|version|mix\b|remix|instrumental|sped|slowed|from\b)/i;

function stripNoise(s: string): string {
  return s
    .replace(BRACKET_NOISE, "")
    .replace(/\s*\((original\s+)?song\)/gi, "")
    .replace(TRAILING_NOISE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** `"Joseph" (feat. …)` → `Joseph (feat. …)` */
function unquote(s: string): string {
  return s.replace(/^["“]\s*([^"”]+?)\s*["”]/, "$1").trim();
}

/** "Rick Astley - Topic" → "Rick Astley", "TroyeSivanVEVO" → "Troye Sivan". */
function channelArtist(channelTitle: string): string {
  const topic = channelTitle.replace(/\s*-\s*Topic$/i, "");
  if (topic !== channelTitle) return topic.trim() || channelTitle;
  const vevo = channelTitle.replace(/VEVO$/i, "");
  if (vevo !== channelTitle) return vevo.replace(/([a-z])([A-Z])/g, "$1 $2").trim() || channelTitle;
  return channelTitle.trim();
}

/**
 * YouTube music titles are usually "Artist - Song (Official Video)" on a
 * channel that may be the artist, a label or VEVO. Split that into the song
 * and the performer so rows read like a music app, not a video list. Anything
 * that doesn't match a known shape keeps the uploader's title and uses the
 * channel as the artist.
 */
export function trackLabels(track: Labelled): { title: string; artist: string } {
  const channel = channelArtist(track.channelTitle);
  const title = stripNoise(track.title) || track.title;

  // "- Topic" channels are YouTube's auto-generated album tracks: the title is
  // already just the song, so a dash inside it is part of the name.
  if (!/-\s*Topic$/i.test(track.channelTitle)) {
    const dash = title.match(/^(.{1,80}?)\s+[-–—]\s+(.+)$/);
    if (dash && !VERSION_TAG.test(dash[2]!)) {
      const artist = dash[1]!.trim();
      const ch = channel.toLowerCase();
      // "Song - Channel × Guest (original song)": the channel names the right side.
      if (ch && !artist.toLowerCase().includes(ch) && dash[2]!.toLowerCase().startsWith(ch)) {
        return { title: unquote(artist), artist: dash[2]!.replace(/\s*\([^)]*\)\s*$/, "").trim() };
      }
      return {
        title: unquote(dash[2]!) || title,
        // Prefer the channel's casing when it's the same name ("DRAKE" → "Drake").
        artist: artist.toLowerCase() === channel.toLowerCase() ? channel : artist,
      };
    }

    // Papoose "Jezebel"
    const quoted = title.match(/^([^"“]{1,80}?)\s+["“]([^"”]+)["”]\s*(.*)$/);
    if (quoted) {
      return { title: `${quoted[2]!.trim()} ${quoted[3]!}`.trim(), artist: quoted[1]!.trim() };
    }

    // "Song | Artist | Producer" — the song leads.
    const piped = title.split(/\s+[|｜]\s+/);
    if (piped.length > 1 && piped[0]) return { title: piped[0].trim(), artist: channel };
  }

  return { title: unquote(title) || title, artist: channel };
}

export function cleanTitle(track: Labelled): string {
  return trackLabels(track).title;
}

export function cleanArtist(track: Labelled): string {
  return trackLabels(track).artist;
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

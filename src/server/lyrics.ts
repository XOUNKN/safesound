import { getDb } from "./db";
import { ApiError } from "./http";
import type { Lyrics } from "@/lib/types";

/**
 * Lyrics come from LRCLIB (https://lrclib.net) — a free, openly licensed
 * community lyrics database with a documented public API. Nothing is scraped:
 * we call the documented endpoints, identify ourselves with a User-Agent as
 * their docs ask, and cache responses server-side to be a good client.
 *
 * Lyrics are cached for LYRICS_TTL and served only to the signed-in user
 * viewing that track inside the app. They are never re-published, exported,
 * or exposed as a bulk endpoint.
 */

const LRCLIB = "https://lrclib.net/api";
const UA = "Resonate/1.0 (self-hosted YouTube music player; +https://github.com/)";
const LYRICS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
/** LRCLIB rejects any duration outside 1..3600 with a 400. */
const MAX_MATCHABLE_DURATION = 3600;
const NEGATIVE_TTL = 12 * 60 * 60 * 1000; // remember misses for 12h too

export const PROVIDER = { name: "LRCLIB", url: "https://lrclib.net" } as const;

/* --------------------- YouTube title normalisation --------------------- */

const NOISE =
  /\b(official\s*(music\s*)?(video|audio|visualizer|lyric\s*video)?|lyrics?|lyric\s*video|audio|video|hd|hq|4k|full\s*album|m\/?v|mv|visuali[sz]er|explicit|clean|remaster(ed)?(\s*\d{4})?|live|color\s*coded|sub\s*espa[nñ]ol|legendado)\b/gi;

function stripNoise(s: string): string {
  return s
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, (m) => (NOISE.test(m) ? " " : m))
    .replace(NOISE, " ")
    .replace(/[|·]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, "")
    .trim();
}

/**
 * Best-effort split of a YouTube title into artist + track. Falls back to
 * using the channel name as the artist, which is right for most VEVO/topic
 * channels.
 */
export function guessArtistAndTrack(
  title: string,
  channelTitle: string,
): { artist: string; track: string } {
  const cleanChannel = channelTitle.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  const cleaned = stripNoise(title);
  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { artist: stripNoise(parts[0]), track: stripNoise(parts.slice(1).join(" - ")) };
  }
  return { artist: cleanChannel, track: cleaned || title };
}

/* ----------------------------- LRC parsing ----------------------------- */

const LRC_LINE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseSyncedLyrics(lrc: string): { timeMs: number; text: string }[] {
  const out: { timeMs: number; text: string }[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    LRC_LINE.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    let lastEnd = 0;
    while ((m = LRC_LINE.exec(raw))) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      const fracRaw = m[3] ?? "0";
      const frac = Number(fracRaw.padEnd(3, "0").slice(0, 3));
      stamps.push(min * 60_000 + sec * 1000 + frac);
      lastEnd = m.index + m[0].length;
    }
    if (!stamps.length) continue;
    const text = raw.slice(lastEnd).trim();
    for (const timeMs of stamps) out.push({ timeMs, text });
  }
  return out.sort((a, b) => a.timeMs - b.timeMs);
}

/* -------------------------------- cache -------------------------------- */

type CachedLyrics = { found: boolean; lyrics?: Omit<Lyrics, "videoId"> };

function cacheGet(key: string): CachedLyrics | null {
  const row = getDb()
    .prepare("SELECT payload FROM api_cache WHERE key = ? AND expires_at > ?")
    .get(key, Date.now()) as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as CachedLyrics;
  } catch {
    return null;
  }
}

function cacheSet(key: string, value: CachedLyrics, ttl: number) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO api_cache (key, payload, created_at, expires_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET payload = excluded.payload,
                                      created_at = excluded.created_at,
                                      expires_at = excluded.expires_at`,
    )
    .run(key, JSON.stringify(value), now, now + ttl);
}

/* --------------------------------- API --------------------------------- */

type LrclibRecord = {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

async function lrclib<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${LRCLIB}${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(
      504,
      "LYRICS_UNAVAILABLE",
      "The lyrics service didn't respond in time.",
      "Playback isn't affected. Try opening lyrics again in a moment.",
    );
  }
  // Any 4xx means "we asked badly or there's no match" — a lookup problem, not
  // an outage. Callers fall through to the next strategy instead of surfacing
  // it, so a rejected exact-match never costs the user their lyrics.
  if (res.status >= 400 && res.status < 500) return null;
  if (!res.ok) {
    throw new ApiError(
      502,
      "LYRICS_UNAVAILABLE",
      "The lyrics provider is having trouble right now.",
      `LRCLIB responded with ${res.status}.`,
    );
  }
  return (await res.json()) as T;
}

function toLyrics(rec: LrclibRecord): Omit<Lyrics, "videoId"> | null {
  if (rec.instrumental) {
    return {
      provider: PROVIDER.name,
      providerUrl: PROVIDER.url,
      trackName: rec.trackName ?? "",
      artistName: rec.artistName ?? "",
      synced: false,
      lines: [{ timeMs: null, text: "♪ This track is marked as instrumental ♪" }],
    };
  }
  if (rec.syncedLyrics) {
    const lines = parseSyncedLyrics(rec.syncedLyrics);
    if (lines.length) {
      return {
        provider: PROVIDER.name,
        providerUrl: PROVIDER.url,
        trackName: rec.trackName ?? "",
        artistName: rec.artistName ?? "",
        synced: true,
        lines,
      };
    }
  }
  if (rec.plainLyrics?.trim()) {
    return {
      provider: PROVIDER.name,
      providerUrl: PROVIDER.url,
      trackName: rec.trackName ?? "",
      artistName: rec.artistName ?? "",
      synced: false,
      lines: rec.plainLyrics
        .split(/\r?\n/)
        .map((text) => ({ timeMs: null, text: text.trim() })),
    };
  }
  return null;
}

export async function getLyrics(
  videoId: string,
  title: string,
  channelTitle: string,
  durationSec: number,
): Promise<Lyrics> {
  const key = `l:${videoId}`;
  const cached = cacheGet(key);
  if (cached) {
    if (cached.found && cached.lyrics) return { videoId, ...cached.lyrics };
    throw notFoundError();
  }

  const { artist, track } = guessArtistAndTrack(title, channelTitle);

  // 1. Exact signature match (gives the best chance of synced lyrics).
  //    The duration is only sent when LRCLIB will accept it; long uploads —
  //    concerts, DJ sets, streams — are matched on title and artist alone.
  let record: LrclibRecord | null = null;
  if (artist.trim() && track.trim()) {
    const matchable = durationSec > 0 && durationSec <= MAX_MATCHABLE_DURATION;
    record = await lrclib<LrclibRecord>("/get", {
      artist_name: artist,
      track_name: track,
      duration: matchable ? String(durationSec) : "",
    });
  }

  // 2. Fall back to fuzzy search, preferring a close duration match.
  if (!record) {
    const results =
      (await lrclib<LrclibRecord[]>("/search", {
        track_name: track || title,
        artist_name: artist,
      })) ?? [];
    const list = Array.isArray(results) ? results : [];
    record =
      list.find(
        (r) => r.syncedLyrics && durationSec > 0 && Math.abs((r.duration ?? 0) - durationSec) <= 5,
      ) ??
      list.find((r) => r.syncedLyrics) ??
      list[0] ??
      null;
  }

  const lyrics = record ? toLyrics(record) : null;
  if (!lyrics) {
    cacheSet(key, { found: false }, NEGATIVE_TTL);
    throw notFoundError();
  }
  cacheSet(key, { found: true, lyrics }, LYRICS_TTL);
  return { videoId, ...lyrics };
}

function notFoundError() {
  return new ApiError(
    404,
    "LYRICS_NOT_FOUND",
    "No lyrics found for this track.",
    `${PROVIDER.name} doesn't have an entry matching this title yet. Live versions, remixes and non-music videos often have none.`,
  );
}

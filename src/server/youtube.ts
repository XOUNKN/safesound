import { getDb } from "./db";
import { ApiError } from "./http";
import type { Track } from "@/lib/types";

/**
 * YouTube Data API v3 client.
 *
 * Policy notes:
 *  - The API key is read from the server environment only and never reaches
 *    the browser. All calls originate here.
 *  - Responses are cached in `api_cache` to stay inside the daily quota.
 *  - Only video *metadata* (id, title, channel, duration, thumbnail URL) is
 *    persisted. No media is downloaded, proxied or stored, and no direct
 *    stream URL is ever resolved. Playback happens exclusively in the
 *    official IFrame player in the user's browser.
 *  - Cached metadata is refreshed on use once it passes MAX_STORAGE_MS,
 *    matching the Developer Policies' 30-day storage window.
 */

const API = "https://www.googleapis.com/youtube/v3";
const SEARCH_TTL = 6 * 60 * 60 * 1000; // 6h
const DETAILS_TTL = 24 * 60 * 60 * 1000; // 24h
const TRENDING_TTL = 3 * 60 * 60 * 1000; // 3h
const MAX_STORAGE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

export const isConfigured = () => Boolean(process.env.YOUTUBE_API_KEY?.trim());

function requireKey(): string {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    throw new ApiError(
      503,
      "YOUTUBE_NOT_CONFIGURED",
      "YouTube search isn't configured on this server yet.",
      "Add a YouTube Data API v3 key as YOUTUBE_API_KEY in .env.local and restart. Everything already in your library keeps working.",
    );
  }
  return key;
}

/* ----------------------------- cache ----------------------------- */

function cacheGet<T>(key: string): T | null {
  const row = getDb()
    .prepare("SELECT payload FROM api_cache WHERE key = ? AND expires_at > ?")
    .get(key, Date.now()) as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

function cacheSet(key: string, value: unknown, ttlMs: number) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO api_cache (key, payload, created_at, expires_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET payload = excluded.payload,
                                      created_at = excluded.created_at,
                                      expires_at = excluded.expires_at`,
    )
    .run(key, JSON.stringify(value), now, now + ttlMs);
}

/* --------------------------- transport --------------------------- */

type YtErrorBody = { error?: { errors?: { reason?: string }[]; message?: string } };

async function call<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", requireKey());

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "TimeoutError";
    throw new ApiError(
      504,
      "NETWORK",
      aborted ? "YouTube took too long to respond." : "We couldn't reach YouTube from the server.",
      "Check the server's network connection and try again.",
    );
  }

  if (res.ok) return (await res.json()) as T;

  let body: YtErrorBody = {};
  try {
    body = (await res.json()) as YtErrorBody;
  } catch {
    /* non-JSON error body */
  }
  const reason = body.error?.errors?.[0]?.reason ?? "";
  const detail = body.error?.message ?? res.statusText;

  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
    throw new ApiError(
      429,
      "YOUTUBE_QUOTA",
      "This app has used its daily YouTube search quota.",
      "Quota resets at midnight Pacific Time. Your playlists, favorites and playback all keep working.",
    );
  }
  if (reason === "keyInvalid" || res.status === 403) {
    throw new ApiError(
      502,
      "YOUTUBE_UNAVAILABLE",
      "YouTube rejected this app's API credentials.",
      "The server's YOUTUBE_API_KEY looks invalid, restricted, or the YouTube Data API v3 isn't enabled for it.",
    );
  }
  if (res.status === 400) {
    throw new ApiError(400, "YOUTUBE_BAD_REQUEST", `YouTube rejected that request: ${detail}`);
  }
  throw new ApiError(
    502,
    "YOUTUBE_UNAVAILABLE",
    "YouTube's API is having trouble right now.",
    "This one is on YouTube's side. Try again shortly.",
  );
}

/* ---------------------------- parsing ---------------------------- */

export function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  const secs = Number(m[4] ?? 0);
  return days * 86400 + hours * 3600 + mins * 60 + secs;
}

type Thumbs = Record<string, { url?: string } | undefined>;

function pickThumb(t: Thumbs | undefined): string | null {
  if (!t) return null;
  return t.maxres?.url ?? t.standard?.url ?? t.high?.url ?? t.medium?.url ?? t.default?.url ?? null;
}

type VideoItem = {
  id: string;
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    thumbnails?: Thumbs;
    publishedAt?: string;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
};

/** The Data API returns HTML-escaped titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function toTrack(v: VideoItem): Track {
  return {
    videoId: v.id,
    title: decodeEntities(v.snippet?.title ?? "Untitled"),
    channelId: v.snippet?.channelId ?? null,
    channelTitle: decodeEntities(v.snippet?.channelTitle ?? "Unknown artist"),
    durationSec: parseDuration(v.contentDetails?.duration),
    thumbnailUrl: pickThumb(v.snippet?.thumbnails),
    publishedAt: v.snippet?.publishedAt ?? null,
  };
}

/* --------------------------- persistence -------------------------- */

export function upsertTracks(tracks: Track[]): void {
  if (!tracks.length) return;
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO tracks (video_id, title, channel_id, channel_title, duration_sec, thumbnail_url, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(video_id) DO UPDATE SET
       title = excluded.title, channel_id = excluded.channel_id,
       channel_title = excluded.channel_title, duration_sec = excluded.duration_sec,
       thumbnail_url = excluded.thumbnail_url, published_at = excluded.published_at,
       updated_at = excluded.updated_at`,
  );
  const now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const t of tracks) {
      stmt.run(
        t.videoId,
        t.title,
        t.channelId,
        t.channelTitle,
        t.durationSec,
        t.thumbnailUrl,
        t.publishedAt ?? null,
        now,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/* ------------------------------ API ------------------------------ */

export async function videoDetails(ids: string[]): Promise<Track[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return [];

  const out: Track[] = [];
  const missing: string[] = [];
  for (const id of unique) {
    const hit = cacheGet<Track>(`v:${id}`);
    if (hit) out.push(hit);
    else missing.push(id);
  }

  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const data = await call<{ items?: VideoItem[] }>("videos", {
      part: "snippet,contentDetails,status",
      id: batch.join(","),
      maxResults: "50",
    });
    for (const item of data.items ?? []) {
      const track = toTrack(item);
      cacheSet(`v:${track.videoId}`, track, DETAILS_TTL);
      out.push(track);
    }
  }

  upsertTracks(out);
  const order = new Map(unique.map((id, i) => [id, i]));
  return out.sort((a, b) => (order.get(a.videoId) ?? 0) - (order.get(b.videoId) ?? 0));
}

export type SearchResult = { items: Track[]; nextPageToken: string | null; cached: boolean };

export async function search(
  query: string,
  pageToken?: string,
  musicOnly = true,
): Promise<SearchResult> {
  const key = `s:${musicOnly ? "m" : "a"}:${query.toLowerCase()}:${pageToken ?? ""}`;
  const cached = cacheGet<{ items: Track[]; nextPageToken: string | null }>(key);
  if (cached) {
    upsertTracks(cached.items);
    return { ...cached, cached: true };
  }

  const params: Record<string, string> = {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "25",
    videoEmbeddable: "true",
    safeSearch: "moderate",
  };
  if (musicOnly) params.videoCategoryId = "10";
  if (pageToken) params.pageToken = pageToken;

  const data = await call<{ items?: { id?: { videoId?: string } }[]; nextPageToken?: string }>(
    "search",
    params,
  );

  const ids = (data.items ?? []).map((i) => i.id?.videoId).filter((v): v is string => Boolean(v));
  const items = ids.length ? await videoDetails(ids) : [];
  const result = { items, nextPageToken: data.nextPageToken ?? null };
  cacheSet(key, result, SEARCH_TTL);
  return { ...result, cached: false };
}

export async function trending(regionCode?: string): Promise<Track[]> {
  const region = (regionCode || process.env.YOUTUBE_REGION || "US").toUpperCase();
  const key = `t:${region}`;
  const cached = cacheGet<Track[]>(key);
  if (cached) {
    upsertTracks(cached);
    return cached;
  }
  const data = await call<{ items?: VideoItem[] }>("videos", {
    part: "snippet,contentDetails,status",
    chart: "mostPopular",
    videoCategoryId: "10",
    regionCode: region,
    maxResults: "30",
  });
  const items = (data.items ?? []).filter((v) => v.status?.embeddable !== false).map(toTrack);
  cacheSet(key, items, TRENDING_TTL);
  upsertTracks(items);
  return items;
}

/**
 * Re-fetches metadata for rows whose snapshot is older than the 30-day
 * storage window. Costs 1 quota unit per 50 videos. Failures are swallowed:
 * a slightly stale cover beats a broken library page.
 */
export async function refreshStaleTracks(videoIds: string[]): Promise<void> {
  if (!isConfigured() || !videoIds.length) return;
  const ids = videoIds.slice(0, 200);
  const cutoff = Date.now() - MAX_STORAGE_MS;
  const placeholders = ids.map(() => "?").join(",");
  const stale = getDb()
    .prepare(
      `SELECT video_id FROM tracks WHERE video_id IN (${placeholders}) AND updated_at < ? LIMIT 50`,
    )
    .all(...ids, cutoff) as { video_id: string }[];
  if (!stale.length) return;
  try {
    await videoDetails(stale.map((r) => r.video_id));
  } catch {
    /* keep serving the cached snapshot */
  }
}

export const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

import { getDb, tx } from "./db";
import { newId, newToken } from "./auth";
import { forbidden, notFound, conflict } from "./http";
import { upsertTracks } from "./youtube";
import type {
  Playlist,
  PlaylistDetail,
  PlaylistTrack,
  Track,
  UserSettings,
  Visibility,
} from "@/lib/types";

/* ------------------------------ mapping ------------------------------ */

type TrackRow = {
  video_id: string;
  title: string;
  channel_id: string | null;
  channel_title: string;
  duration_sec: number;
  thumbnail_url: string | null;
  published_at: string | null;
};

export const rowToTrack = (r: TrackRow): Track => ({
  videoId: r.video_id,
  title: r.title,
  channelId: r.channel_id,
  channelTitle: r.channel_title,
  durationSec: r.duration_sec,
  thumbnailUrl: r.thumbnail_url,
  publishedAt: r.published_at,
});

const TRACK_COLS =
  "t.video_id, t.title, t.channel_id, t.channel_title, t.duration_sec, t.thumbnail_url, t.published_at";

/**
 * Writes a client-supplied track snapshot into the canonical `tracks` table.
 * Clients may only ever contribute metadata for a video they already received
 * from our own server-side YouTube calls; the fields are length-clamped here
 * so a hostile client can't bloat the database.
 */
export function ensureTrack(t: Track): void {
  upsertTracks([
    {
      videoId: t.videoId,
      title: t.title.slice(0, 300),
      channelId: t.channelId ? t.channelId.slice(0, 64) : null,
      channelTitle: t.channelTitle.slice(0, 200),
      durationSec: Math.max(0, Math.min(86_400, Math.trunc(t.durationSec) || 0)),
      thumbnailUrl: t.thumbnailUrl ? t.thumbnailUrl.slice(0, 500) : null,
      publishedAt: t.publishedAt ?? null,
    },
  ]);
}

export function getTracks(videoIds: string[]): Map<string, Track> {
  if (!videoIds.length) return new Map();
  const ph = videoIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT ${TRACK_COLS} FROM tracks t WHERE t.video_id IN (${ph})`)
    .all(...videoIds) as TrackRow[];
  return new Map(rows.map((r) => [r.video_id, rowToTrack(r)]));
}

/* ----------------------------- playlists ----------------------------- */

type PlaylistRow = {
  id: string;
  name: string;
  description: string;
  visibility: Visibility;
  share_token: string | null;
  created_at: number;
  updated_at: number;
  track_count: number;
  duration_sec: number;
};

const PLAYLIST_SELECT = `
  SELECT p.id, p.name, p.description, p.visibility, p.share_token, p.created_at, p.updated_at,
         (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count,
         COALESCE((SELECT SUM(t.duration_sec) FROM playlist_tracks pt
                     JOIN tracks t ON t.video_id = pt.video_id
                    WHERE pt.playlist_id = p.id), 0) AS duration_sec
    FROM playlists p`;

function covers(playlistId: string, limit = 4): string[] {
  const rows = getDb()
    .prepare(
      `SELECT t.thumbnail_url FROM playlist_tracks pt
         JOIN tracks t ON t.video_id = pt.video_id
        WHERE pt.playlist_id = ? AND t.thumbnail_url IS NOT NULL
        ORDER BY pt.position LIMIT ?`,
    )
    .all(playlistId, limit) as { thumbnail_url: string }[];
  return rows.map((r) => r.thumbnail_url);
}

const toPlaylist = (r: PlaylistRow): Playlist => ({
  id: r.id,
  name: r.name,
  description: r.description,
  visibility: r.visibility,
  shareToken: r.share_token,
  trackCount: r.track_count,
  durationSec: r.duration_sec,
  covers: covers(r.id),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export type PlaylistSort = "recent" | "alpha" | "created" | "size";

export function listPlaylists(userId: string, sort: PlaylistSort = "recent"): Playlist[] {
  const order =
    sort === "alpha"
      ? "p.name COLLATE NOCASE ASC"
      : sort === "created"
        ? "p.created_at DESC"
        : sort === "size"
          ? "track_count DESC, p.updated_at DESC"
          : "p.updated_at DESC";
  const rows = getDb()
    .prepare(`${PLAYLIST_SELECT} WHERE p.user_id = ? ORDER BY ${order}`)
    .all(userId) as PlaylistRow[];
  return rows.map(toPlaylist);
}

/** Loads a playlist and asserts the caller owns it. */
export function getOwnedPlaylist(userId: string, playlistId: string): Playlist {
  const row = getDb()
    .prepare(`${PLAYLIST_SELECT} WHERE p.id = ?`)
    .get(playlistId) as (PlaylistRow & { user_id?: string }) | undefined;
  if (!row) throw notFound("That playlist no longer exists.");
  const owner = getDb().prepare("SELECT user_id FROM playlists WHERE id = ?").get(playlistId) as
    | { user_id: string }
    | undefined;
  if (!owner || owner.user_id !== userId) {
    throw forbidden("That playlist belongs to another account.");
  }
  return toPlaylist(row);
}

export function playlistTracks(playlistId: string): PlaylistTrack[] {
  const rows = getDb()
    .prepare(
      `SELECT pt.id AS entry_id, pt.position, pt.added_at, ${TRACK_COLS}
         FROM playlist_tracks pt JOIN tracks t ON t.video_id = pt.video_id
        WHERE pt.playlist_id = ? ORDER BY pt.position ASC`,
    )
    .all(playlistId) as (TrackRow & { entry_id: string; position: number; added_at: number })[];
  return rows.map((r) => ({
    ...rowToTrack(r),
    entryId: r.entry_id,
    position: r.position,
    addedAt: r.added_at,
  }));
}

export function getPlaylistDetail(userId: string, playlistId: string): PlaylistDetail {
  const p = getOwnedPlaylist(userId, playlistId);
  return { ...p, tracks: playlistTracks(playlistId) };
}

export function getSharedPlaylist(token: string): (PlaylistDetail & { ownerName: string }) | null {
  const row = getDb()
    .prepare(`${PLAYLIST_SELECT} WHERE p.share_token = ? AND p.visibility = 'unlisted'`)
    .get(token) as PlaylistRow | undefined;
  if (!row) return null;
  const owner = getDb()
    .prepare(
      "SELECT u.display_name FROM playlists p JOIN users u ON u.id = p.user_id WHERE p.id = ?",
    )
    .get(row.id) as { display_name: string } | undefined;
  return {
    ...toPlaylist(row),
    tracks: playlistTracks(row.id),
    ownerName: owner?.display_name ?? "A Resonate listener",
  };
}

export const MAX_PLAYLISTS = 500;
export const MAX_TRACKS_PER_PLAYLIST = 1000;

export function createPlaylist(userId: string, name: string, description = ""): Playlist {
  const count = getDb()
    .prepare("SELECT COUNT(*) AS n FROM playlists WHERE user_id = ?")
    .get(userId) as { n: number };
  if (count.n >= MAX_PLAYLISTS) {
    throw conflict(
      `You've reached the limit of ${MAX_PLAYLISTS} playlists.`,
      "Delete one you no longer use to make room.",
    );
  }
  const id = newId();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO playlists (id, user_id, name, description, visibility, share_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'private', NULL, ?, ?)`,
    )
    .run(id, userId, name, description, now, now);
  return getOwnedPlaylist(userId, id);
}

export function updatePlaylist(
  userId: string,
  playlistId: string,
  patch: { name?: string; description?: string; visibility?: Visibility },
): Playlist {
  getOwnedPlaylist(userId, playlistId);
  const db = getDb();
  if (patch.name !== undefined) {
    db.prepare("UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?").run(
      patch.name,
      Date.now(),
      playlistId,
    );
  }
  if (patch.description !== undefined) {
    db.prepare("UPDATE playlists SET description = ?, updated_at = ? WHERE id = ?").run(
      patch.description,
      Date.now(),
      playlistId,
    );
  }
  if (patch.visibility !== undefined) {
    if (patch.visibility === "unlisted") {
      const cur = db.prepare("SELECT share_token FROM playlists WHERE id = ?").get(playlistId) as {
        share_token: string | null;
      };
      const token = cur.share_token ?? newToken().slice(0, 22);
      db.prepare(
        "UPDATE playlists SET visibility = 'unlisted', share_token = ?, updated_at = ? WHERE id = ?",
      ).run(token, Date.now(), playlistId);
    } else {
      db.prepare(
        "UPDATE playlists SET visibility = 'private', share_token = NULL, updated_at = ? WHERE id = ?",
      ).run(Date.now(), playlistId);
    }
  }
  return getOwnedPlaylist(userId, playlistId);
}

export function deletePlaylist(userId: string, playlistId: string): void {
  getOwnedPlaylist(userId, playlistId);
  getDb().prepare("DELETE FROM playlists WHERE id = ?").run(playlistId);
}

export function addTracksToPlaylist(
  userId: string,
  playlistId: string,
  tracks: Track[],
): { added: number; skipped: number } {
  getOwnedPlaylist(userId, playlistId);
  for (const t of tracks) ensureTrack(t);

  return tx((db) => {
    const existing = db
      .prepare("SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlist_id = ?")
      .get(playlistId) as { n: number };
    const maxRow = db
      .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM playlist_tracks WHERE playlist_id = ?")
      .get(playlistId) as { m: number };

    let pos = maxRow.m + 1;
    let added = 0;
    let skipped = 0;
    const insert = db.prepare(
      `INSERT OR IGNORE INTO playlist_tracks (id, playlist_id, video_id, position, added_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const t of tracks) {
      if (existing.n + added >= MAX_TRACKS_PER_PLAYLIST) {
        skipped += 1;
        continue;
      }
      const res = insert.run(newId(), playlistId, t.videoId, pos, Date.now());
      if (res.changes > 0) {
        added += 1;
        pos += 1;
      } else {
        skipped += 1;
      }
    }
    db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(Date.now(), playlistId);
    return { added, skipped };
  });
}

export function removeTrackFromPlaylist(
  userId: string,
  playlistId: string,
  entryId: string,
): void {
  getOwnedPlaylist(userId, playlistId);
  tx((db) => {
    const res = db
      .prepare("DELETE FROM playlist_tracks WHERE id = ? AND playlist_id = ?")
      .run(entryId, playlistId);
    if (res.changes === 0) throw notFound("That track isn't in this playlist any more.");
    resequence(db, playlistId);
    db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(Date.now(), playlistId);
  });
}

function resequence(db: ReturnType<typeof getDb>, playlistId: string) {
  const rows = db
    .prepare("SELECT id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC")
    .all(playlistId) as { id: string }[];
  const stmt = db.prepare("UPDATE playlist_tracks SET position = ? WHERE id = ?");
  rows.forEach((r, i) => stmt.run(i, r.id));
}

/** Applies an explicit full ordering of entry ids. Rejects partial lists. */
export function reorderPlaylist(userId: string, playlistId: string, entryIds: string[]): void {
  getOwnedPlaylist(userId, playlistId);
  tx((db) => {
    const current = db
      .prepare("SELECT id FROM playlist_tracks WHERE playlist_id = ?")
      .all(playlistId) as { id: string }[];
    const currentSet = new Set(current.map((r) => r.id));
    if (entryIds.length !== currentSet.size || !entryIds.every((id) => currentSet.has(id))) {
      throw conflict(
        "The playlist changed while you were reordering it.",
        "Reopen the playlist and try again.",
      );
    }
    // Two-phase write: positions are UNIQUE-adjacent, so park them out of range first.
    const park = db.prepare("UPDATE playlist_tracks SET position = ? WHERE id = ?");
    entryIds.forEach((id, i) => park.run(-1 - i, id));
    entryIds.forEach((id, i) => park.run(i, id));
    db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(Date.now(), playlistId);
  });
}

/* ------------------------------ favorites ----------------------------- */

export type LibrarySort = "recent" | "alpha" | "played";

export function listFavorites(userId: string, sort: LibrarySort = "recent"): Track[] {
  const order =
    sort === "alpha"
      ? "t.title COLLATE NOCASE ASC"
      : sort === "played"
        ? `(SELECT MAX(h.played_at) FROM playback_history h
              WHERE h.user_id = f.user_id AND h.video_id = f.video_id) DESC NULLS LAST`
        : "f.created_at DESC";
  const rows = getDb()
    .prepare(
      `SELECT ${TRACK_COLS} FROM favorites f JOIN tracks t ON t.video_id = f.video_id
        WHERE f.user_id = ? ORDER BY ${order}`,
    )
    .all(userId) as TrackRow[];
  return rows.map(rowToTrack);
}

export function isFavorite(userId: string, videoId: string): boolean {
  return Boolean(
    getDb()
      .prepare("SELECT 1 AS x FROM favorites WHERE user_id = ? AND video_id = ?")
      .get(userId, videoId),
  );
}

export function favoriteIds(userId: string): string[] {
  const rows = getDb()
    .prepare("SELECT video_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as { video_id: string }[];
  return rows.map((r) => r.video_id);
}

export function setFavorite(userId: string, track: Track, on: boolean): boolean {
  ensureTrack(track);
  const db = getDb();
  if (on) {
    db.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, video_id, created_at) VALUES (?, ?, ?)",
    ).run(userId, track.videoId, Date.now());
  } else {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND video_id = ?").run(
      userId,
      track.videoId,
    );
  }
  return on;
}

/* ------------------------------- history ------------------------------ */

const HISTORY_CAP = 500;

export function recordPlayback(userId: string, track: Track, source: string): void {
  ensureTrack(track);
  const db = getDb();
  const recent = db
    .prepare(
      "SELECT id, played_at FROM playback_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 1",
    )
    .get(userId) as { id: string; played_at: number } | undefined;
  // Collapse rapid repeats of the same track (e.g. a seek-triggered replay).
  const repeatWithinTwoMinutes =
    recent &&
    Date.now() - recent.played_at < 120_000 &&
    (
      db.prepare("SELECT video_id FROM playback_history WHERE id = ?").get(recent.id) as {
        video_id: string;
      }
    ).video_id === track.videoId;
  if (repeatWithinTwoMinutes) {
    db.prepare("UPDATE playback_history SET played_at = ? WHERE id = ?").run(Date.now(), recent.id);
    return;
  }
  db.prepare(
    "INSERT INTO playback_history (id, user_id, video_id, played_at, source) VALUES (?, ?, ?, ?, ?)",
  ).run(newId(), userId, track.videoId, Date.now(), source.slice(0, 40));
  db.prepare(
    `DELETE FROM playback_history WHERE user_id = ? AND id NOT IN (
       SELECT id FROM playback_history WHERE user_id = ? ORDER BY played_at DESC LIMIT ?)`,
  ).run(userId, userId, HISTORY_CAP);
}

export type HistoryEntry = Track & { playedAt: number };

export function listHistory(userId: string, limit = 100): HistoryEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT ${TRACK_COLS}, MAX(h.played_at) AS played_at
         FROM playback_history h JOIN tracks t ON t.video_id = h.video_id
        WHERE h.user_id = ?
        GROUP BY h.video_id
        ORDER BY played_at DESC LIMIT ?`,
    )
    .all(userId, limit) as (TrackRow & { played_at: number })[];
  return rows.map((r) => ({ ...rowToTrack(r), playedAt: r.played_at }));
}

export function clearHistory(userId: string): void {
  getDb().prepare("DELETE FROM playback_history WHERE user_id = ?").run(userId);
}

/** Channels the user actually listens to, used to build the Discover row. */
export function topChannels(userId: string, limit = 6): { channelTitle: string; plays: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT t.channel_title AS channel_title, COUNT(*) AS plays
         FROM playback_history h JOIN tracks t ON t.video_id = h.video_id
        WHERE h.user_id = ? AND t.channel_title != ''
        GROUP BY t.channel_title ORDER BY plays DESC, MAX(h.played_at) DESC LIMIT ?`,
    )
    .all(userId, limit) as { channel_title: string; plays: number }[];
  return rows.map((r) => ({ channelTitle: r.channel_title, plays: r.plays }));
}

/* --------------------------- search history --------------------------- */

const SEARCH_CAP = 50;

export function recordSearch(userId: string, query: string): void {
  const db = getDb();
  db.prepare("DELETE FROM search_history WHERE user_id = ? AND query = ?").run(userId, query);
  db.prepare(
    "INSERT INTO search_history (id, user_id, query, created_at) VALUES (?, ?, ?, ?)",
  ).run(newId(), userId, query, Date.now());
  db.prepare(
    `DELETE FROM search_history WHERE user_id = ? AND id NOT IN (
       SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)`,
  ).run(userId, userId, SEARCH_CAP);
}

export function listSearches(userId: string, limit = 20): { query: string; at: number }[] {
  const rows = getDb()
    .prepare(
      "SELECT query, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(userId, limit) as { query: string; created_at: number }[];
  return rows.map((r) => ({ query: r.query, at: r.created_at }));
}

export function clearSearches(userId: string, query?: string): void {
  if (query) {
    getDb()
      .prepare("DELETE FROM search_history WHERE user_id = ? AND query = ?")
      .run(userId, query);
  } else {
    getDb().prepare("DELETE FROM search_history WHERE user_id = ?").run(userId);
  }
}

/* ------------------------------ settings ------------------------------ */

type SettingsRow = {
  theme: UserSettings["theme"];
  accent: string;
  volume: number;
  repeat_mode: UserSettings["repeatMode"];
  shuffle: number;
  crossfade_sec: number;
  autoplay: number;
  queue_add_position: UserSettings["queueAddPosition"];
  clear_queue_on_play: number;
  lyrics_enabled: number;
  lyrics_autoscroll: number;
  reduce_motion: number;
  save_history: number;
  save_search_history: number;
  notify_queue_end: number;
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  accent: "ember",
  volume: 100,
  repeatMode: "off",
  shuffle: false,
  crossfadeSec: 0,
  autoplay: true,
  queueAddPosition: "end",
  clearQueueOnPlay: true,
  lyricsEnabled: true,
  lyricsAutoscroll: true,
  reduceMotion: false,
  saveHistory: true,
  saveSearchHistory: true,
  notifyQueueEnd: false,
};

export function getSettings(userId: string): UserSettings {
  const row = getDb()
    .prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .get(userId) as SettingsRow | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    theme: row.theme,
    accent: row.accent,
    volume: row.volume,
    repeatMode: row.repeat_mode,
    shuffle: Boolean(row.shuffle),
    crossfadeSec: row.crossfade_sec,
    autoplay: Boolean(row.autoplay),
    queueAddPosition: row.queue_add_position,
    clearQueueOnPlay: Boolean(row.clear_queue_on_play),
    lyricsEnabled: Boolean(row.lyrics_enabled),
    lyricsAutoscroll: Boolean(row.lyrics_autoscroll),
    reduceMotion: Boolean(row.reduce_motion),
    saveHistory: Boolean(row.save_history),
    saveSearchHistory: Boolean(row.save_search_history),
    notifyQueueEnd: Boolean(row.notify_queue_end),
  };
}

export function saveSettings(userId: string, patch: Partial<UserSettings>): UserSettings {
  const next = { ...getSettings(userId), ...patch };
  getDb()
    .prepare(
      `INSERT INTO user_settings (
         user_id, theme, accent, volume, repeat_mode, shuffle, crossfade_sec, autoplay,
         queue_add_position, clear_queue_on_play, lyrics_enabled, lyrics_autoscroll, reduce_motion,
         save_history, save_search_history, notify_queue_end, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET
         theme=excluded.theme, accent=excluded.accent, volume=excluded.volume,
         repeat_mode=excluded.repeat_mode, shuffle=excluded.shuffle,
         crossfade_sec=excluded.crossfade_sec, autoplay=excluded.autoplay,
         queue_add_position=excluded.queue_add_position,
         clear_queue_on_play=excluded.clear_queue_on_play, lyrics_enabled=excluded.lyrics_enabled,
         lyrics_autoscroll=excluded.lyrics_autoscroll, reduce_motion=excluded.reduce_motion,
         save_history=excluded.save_history, save_search_history=excluded.save_search_history,
         notify_queue_end=excluded.notify_queue_end, updated_at=excluded.updated_at`,
    )
    .run(
      userId,
      next.theme,
      next.accent,
      next.volume,
      next.repeatMode,
      next.shuffle ? 1 : 0,
      next.crossfadeSec,
      next.autoplay ? 1 : 0,
      next.queueAddPosition,
      next.clearQueueOnPlay ? 1 : 0,
      next.lyricsEnabled ? 1 : 0,
      next.lyricsAutoscroll ? 1 : 0,
      next.reduceMotion ? 1 : 0,
      next.saveHistory ? 1 : 0,
      next.saveSearchHistory ? 1 : 0,
      next.notifyQueueEnd ? 1 : 0,
      Date.now(),
    );
  return next;
}

/* -------------------------------- queue ------------------------------- */

export type QueueContext = { type: string; id: string | null; name: string } | null;
export type SavedQueue = { tracks: Track[]; currentIndex: number; context: QueueContext };

export function loadQueue(userId: string): SavedQueue {
  const rows = getDb()
    .prepare(
      `SELECT ${TRACK_COLS} FROM queue_items q JOIN tracks t ON t.video_id = q.video_id
        WHERE q.user_id = ? ORDER BY q.position ASC`,
    )
    .all(userId) as TrackRow[];
  const state = getDb()
    .prepare("SELECT current_index, context_type, context_id, context_name FROM queue_state WHERE user_id = ?")
    .get(userId) as
    | { current_index: number; context_type: string | null; context_id: string | null; context_name: string | null }
    | undefined;
  return {
    tracks: rows.map(rowToTrack),
    currentIndex: Math.min(state?.current_index ?? 0, Math.max(0, rows.length - 1)),
    context: state?.context_type
      ? { type: state.context_type, id: state.context_id, name: state.context_name ?? "" }
      : null,
  };
}

export const MAX_QUEUE = 500;

export function saveQueue(
  userId: string,
  tracks: Track[],
  currentIndex: number,
  context: QueueContext,
): void {
  const capped = tracks.slice(0, MAX_QUEUE);
  for (const t of capped) ensureTrack(t);
  tx((db) => {
    db.prepare("DELETE FROM queue_items WHERE user_id = ?").run(userId);
    const stmt = db.prepare(
      "INSERT INTO queue_items (user_id, position, video_id) VALUES (?, ?, ?)",
    );
    // A queue may legitimately contain the same video twice; positions keep them distinct.
    capped.forEach((t, i) => stmt.run(userId, i, t.videoId));
    db.prepare(
      `INSERT INTO queue_state (user_id, current_index, position_sec, context_type, context_id, context_name, updated_at)
       VALUES (?, ?, 0, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET current_index=excluded.current_index,
         context_type=excluded.context_type, context_id=excluded.context_id,
         context_name=excluded.context_name, updated_at=excluded.updated_at`,
    ).run(
      userId,
      Math.max(0, Math.min(currentIndex, Math.max(0, capped.length - 1))),
      context?.type ?? null,
      context?.id ?? null,
      context?.name ?? null,
      Date.now(),
    );
  });
}

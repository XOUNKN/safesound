import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

/**
 * Relational schema notes
 * -----------------------
 * `tracks` is the single canonical metadata table for every YouTube video the
 * app has ever seen. Playlists, favorites, history and the saved queue all
 * reference it by `video_id`. This is deliberate: rendering a playlist is one
 * indexed join and costs *zero* YouTube API quota, which is what the platform
 * policy requires (store IDs + the small metadata snapshot the API returns,
 * never the media itself).
 */

let _db: DatabaseSync | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  username       TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL,
  avatar_color   TEXT NOT NULL DEFAULT 'violet',
  avatar_emoji   TEXT NOT NULL DEFAULT '',
  password_hash  TEXT NOT NULL,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);

-- Canonical YouTube metadata snapshot. No media is ever stored, only the
-- video id and the descriptive fields the Data API returns.
CREATE TABLE IF NOT EXISTS tracks (
  video_id       TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  channel_id     TEXT,
  channel_title  TEXT NOT NULL DEFAULT '',
  duration_sec   INTEGER NOT NULL DEFAULT 0,
  thumbnail_url  TEXT,
  published_at   TEXT,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlists (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted')),
  share_token TEXT UNIQUE,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id          TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id    TEXT NOT NULL REFERENCES tracks(video_id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  added_at    INTEGER NOT NULL,
  UNIQUE (playlist_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_ptracks_order ON playlist_tracks(playlist_id, position);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL REFERENCES tracks(video_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS playback_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL REFERENCES tracks(video_id) ON DELETE CASCADE,
  played_at  INTEGER NOT NULL,
  source     TEXT NOT NULL DEFAULT 'unknown'
);
CREATE INDEX IF NOT EXISTS idx_history_user ON playback_history(user_id, played_at DESC);

CREATE TABLE IF NOT EXISTS search_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme             TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','dark','light')),
  accent            TEXT NOT NULL DEFAULT 'violet',
  volume            INTEGER NOT NULL DEFAULT 100,
  repeat_mode       TEXT NOT NULL DEFAULT 'off' CHECK (repeat_mode IN ('off','one','all')),
  shuffle           INTEGER NOT NULL DEFAULT 0,
  crossfade_sec     INTEGER NOT NULL DEFAULT 0,
  autoplay          INTEGER NOT NULL DEFAULT 1,
  queue_add_position TEXT NOT NULL DEFAULT 'end' CHECK (queue_add_position IN ('end','next')),
  clear_queue_on_play INTEGER NOT NULL DEFAULT 1,
  lyrics_enabled    INTEGER NOT NULL DEFAULT 1,
  lyrics_autoscroll INTEGER NOT NULL DEFAULT 1,
  reduce_motion     INTEGER NOT NULL DEFAULT 0,
  save_history      INTEGER NOT NULL DEFAULT 1,
  save_search_history INTEGER NOT NULL DEFAULT 1,
  notify_queue_end  INTEGER NOT NULL DEFAULT 0,
  updated_at        INTEGER NOT NULL
);

-- Persisted "Up Next". Survives refresh and navigation.
CREATE TABLE IF NOT EXISTS queue_items (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  video_id TEXT NOT NULL REFERENCES tracks(video_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, position)
);

CREATE TABLE IF NOT EXISTS queue_state (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_index INTEGER NOT NULL DEFAULT 0,
  position_sec  REAL NOT NULL DEFAULT 0,
  context_type  TEXT,
  context_id    TEXT,
  context_name  TEXT,
  updated_at    INTEGER NOT NULL
);

-- Server-side response cache for third-party APIs (YouTube Data API, lyrics).
-- Keeps us well inside quota and inside each provider's caching guidance.
CREATE TABLE IF NOT EXISTS api_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cache_expiry ON api_cache(expires_at);
`;

export function getDb(): DatabaseSync {
  if (_db) return _db;

  const rel = process.env.DATABASE_PATH || "./data/resonate.db";
  const file = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(SCHEMA);

  // Opportunistic cleanup of expired rows on boot.
  const now = Date.now();
  db.prepare("DELETE FROM api_cache WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);

  _db = db;
  return db;
}

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export function tx<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn(db);
    db.exec("COMMIT");
    return out;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* connection already rolled back */
    }
    throw err;
  }
}

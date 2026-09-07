/**
 * DEVELOPMENT UTILITY — not part of the product.
 *
 * Inserts a handful of well-known YouTube video ids into the `tracks` metadata
 * table so playlists, the queue and the player can be exercised on a machine
 * that has no YOUTUBE_API_KEY configured.
 *
 * This does not fake search: /api/search still reports honestly that it is not
 * configured. It only pre-populates the metadata cache the same way a real
 * search would have.
 *
 * Usage: node scripts/seed-tracks.mjs
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const rel = process.env.DATABASE_PATH || "./data/resonate.db";
const file = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);

if (!fs.existsSync(file)) {
  console.error(`No database at ${file}. Start the app once first (npm run dev).`);
  process.exit(1);
}

const TRACKS = [
  ["dQw4w9WgXcQ", "Rick Astley - Never Gonna Give You Up (Official Video)", "Rick Astley", 213],
  ["kJQP7kiw5Fk", "Luis Fonsi - Despacito ft. Daddy Yankee", "Luis Fonsi", 282],
  ["9bZkp7q19f0", "PSY - GANGNAM STYLE (강남스타일) M/V", "officialpsy", 253],
  ["JGwWNGJdvx8", "Ed Sheeran - Shape of You (Official Music Video)", "Ed Sheeran", 263],
  ["fJ9rUzIMcZQ", "Queen - Bohemian Rhapsody (Official Video Remastered)", "Queen Official", 355],
  ["OPf0YbXqDm0", "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars", "Mark Ronson", 270],
  ["RgKAFK5djSk", "Wiz Khalifa - See You Again ft. Charlie Puth", "Wiz Khalifa", 237],
  ["hT_nvWreIhg", "OneRepublic - Counting Stars (Official Music Video)", "OneRepublic", 257],
  ["YQHsXMglC9A", "Adele - Hello (Official Music Video)", "Adele", 367],
  ["CevxZvSJLk8", "Katy Perry - Roar (Official)", "Katy Perry", 269],
];

const db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys = ON");

const stmt = db.prepare(
  `INSERT INTO tracks (video_id, title, channel_id, channel_title, duration_sec, thumbnail_url, published_at, updated_at)
   VALUES (?, ?, NULL, ?, ?, ?, NULL, ?)
   ON CONFLICT(video_id) DO UPDATE SET
     title = excluded.title, channel_title = excluded.channel_title,
     duration_sec = excluded.duration_sec, thumbnail_url = excluded.thumbnail_url,
     updated_at = excluded.updated_at`,
);

const now = Date.now();
for (const [id, title, channel, duration] of TRACKS) {
  stmt.run(id, title, channel, duration, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, now);
}

console.log(`Seeded ${TRACKS.length} track metadata rows into ${path.relative(process.cwd(), file)}.`);
console.log("Search still requires a real YOUTUBE_API_KEY — this only fills the metadata cache.");
db.close();

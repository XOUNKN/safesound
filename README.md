# Resonate

A mobile-first music player built on YouTube's official APIs. Search for music, build
playlists and queues that persist to a real database, and listen in an interface designed
for music rather than video.

Resonate is an independent project with its own name, mark, icon set and interface. It is
not affiliated with YouTube, Google, or any other music service.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in the values below
npm run dev                    # http://localhost:3000
```

The SQLite database is created automatically on first boot at `data/resonate.db`.

### Environment

| Variable | Required | What it does |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | For search & trending | A YouTube Data API v3 key. Read **only** on the server; never sent to the browser. |
| `AUTH_SECRET` | In production | Pepper for session and reset-token digests. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. In development a random one is written to `data/.dev-auth-secret`. |
| `YOUTUBE_REGION` | No | ISO-3166 country for the Trending chart. Defaults to `US`. |
| `DATABASE_PATH` | No | SQLite file path. Defaults to `./data/resonate.db`. |

**Without `YOUTUBE_API_KEY`, the app still runs.** Sign-up, playlists, favorites, history,
the queue, lyrics and playback all work; search and trending report — honestly and
specifically — that the server has no key configured.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Delete the SQLite file so the schema is recreated |
| `node scripts/seed-tracks.mjs` | **Dev only.** Seeds the track-metadata cache with a few real video ids so playlists and the queue can be exercised without an API key. It does not fake search. |

---

## Architecture

```
src/
  app/                 Routes. Pages are client components; /api/* are Node route handlers.
  server/              Server-only: db, auth, sessions, rate limiting, YouTube, lyrics, repo.
  lib/                 Shared with the browser: types, formatting, fetch client, the store.
  components/          UI. player/ holds the engine and the dock.
```

### One source of truth for playback

`src/lib/store.ts` is a small vanilla store consumed through `useSyncExternalStore`. It owns
the current track, queue, index, play state, position, volume, repeat, shuffle, context and
player visibility. The mini player, the full Now Playing screen, the queue drawer, the lyrics
panel and every track row all read from it, so they cannot disagree.

The store never talks to YouTube directly. It drives a `PlayerEngine` interface that
`components/player/YouTubeEngine.tsx` implements.

### The player never remounts

The mini player and the full-screen Now Playing view are the **same element tree** with
different CSS. Expanding changes classes; it does not move the iframe in the DOM, so audio
never stops. The dock is mounted for the whole session — including when the queue is empty —
so the first `loadVideoById` happens inside the user's own click. (Mounting it lazily loses
the gesture, and browsers then refuse to start audio.)

### Crossfade is real

Two official IFrame players run side by side. Near the end of a track the idle deck loads the
next video, starts at volume 0, and the two volumes are ramped in opposite directions with a
smoothstep curve. No audio is intercepted, decoded or routed anywhere — both decks are
ordinary YouTube embeds.

If the browser refuses to auto-start the incoming deck, the fade is cancelled within 2.5s and
playback cuts cleanly rather than leaving silence.

### What is deliberately *not* implemented

An equalizer (bass / mid / treble / presets). Shaping audio requires the decoded signal in a
Web Audio graph, and YouTube playback happens inside a cross-origin iframe the page cannot
reach. Rather than ship sliders that move without doing anything, Settings shows an
"Unavailable" card explaining why. Volume — which the IFrame API genuinely exposes — works.

---

## Data model

`tracks` is the canonical metadata table for every YouTube video the app has seen. Playlists,
favorites, history and the saved queue all reference it by `video_id`, so rendering a playlist
is one indexed join and costs **zero** API quota.

```
users ──┬── sessions
        ├── password_resets
        ├── playlists ──── playlist_tracks ──┐
        ├── favorites ───────────────────────┤
        ├── playback_history ────────────────┼──> tracks (video_id)
        ├── search_history                   │
        ├── queue_items ─────────────────────┘
        ├── queue_state
        └── user_settings

api_cache   server-side cache for YouTube and lyrics responses
```

Only IDs and the small descriptive snapshot the Data API returns are stored. No media is ever
downloaded, proxied or re-hosted. Snapshots older than 30 days are refreshed on next use, in
line with YouTube's developer policies on stored API data.

---

## Security

- Passwords are stored only as salted **scrypt** digests (N=2^15). Comparison is constant-time,
  and a failed lookup burns equivalent CPU so login timing can't enumerate accounts.
- Sessions are 256-bit random tokens in an httpOnly, SameSite=Lax cookie. The database stores
  only an HMAC digest, keyed by `AUTH_SECRET`.
- Every playlist read and write re-checks ownership on the server. Client-side permissions are
  never trusted.
- All request bodies are validated with Zod, including a strict YouTube video-id pattern and an
  allowlist of YouTube thumbnail hosts.
- Per-IP rate limits on search, lyrics, login, signup, password change and password reset, each
  with its own explanatory message. (In-memory: single-instance.)
- Password reset tokens are single-use, expire in an hour, and invalidate every existing session
  on redemption.
- The YouTube API key is read only in `src/server/youtube.ts` and never reaches the client.

### Password reset without a mail transport

This deployment has no outbound email configured. Rather than pretend a message was sent, the
reset link is written to the server log, and returned inline **in development only** so the flow
is testable. It is never returned in production, because that would let anyone reset any account
they can name. The response shape is identical whether or not the address exists.

---

## Testing notes

The API surface was exercised end to end: sign-up and duplicate/weak-credential rejection,
login timing parity, rate limits, password reset (issue, redeem, reuse, session invalidation),
playlist create/add/dedupe/reorder/rename/delete, share-link creation and revocation, favorites,
history, queue persistence with duplicate tracks, settings validation, lyrics (real synced
lyrics from LRCLIB, plus caching and the not-found path), and cross-user authorization — a
second account gets `FORBIDDEN` on every read and write of the first account's playlist.

The UI was driven in Chrome: sign-up, playlist rendering, drag-reorder in both the queue and a
playlist (verified against the server), the overflow sheet, favoriting, theme switching, queue
persistence across reload, and the mobile layout at 390px.

**Playback could not be verified in that browser profile.** A bare `youtube.com/embed/...` page —
with no app involved — fails there with YouTube's own "Video player configuration error
(Error 153)", so no embed can play. The app handles it correctly: a watchdog reports
"This track didn't start playing" with next steps instead of spinning forever. Run it in a normal
browser to hear audio.

---

## Attribution

Music is searched and played through YouTube's official APIs and embedded player. Lyrics come
from [LRCLIB](https://lrclib.net). Full details are on the `/legal` page in the app.

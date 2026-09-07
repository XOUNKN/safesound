"use client";

import { useSyncExternalStore } from "react";
import { api, describeError, RequestError } from "./api";
import type {
  Playlist,
  PublicUser,
  RepeatMode,
  Track,
  UserSettings,
} from "./types";

/* ===================================================================== *
 * Types
 * ===================================================================== */

/** A queue entry. `qid` is stable across reorders, so React keys, drag
 *  handles and shuffle-restore all work even when a track appears twice. */
export type QueueItem = { qid: string; track: Track };

export type QueueContext = { type: string; id: string | null; name: string } | null;

export type PlaybackError = { code: string; message: string; hint?: string } | null;

export type Toast = {
  id: string;
  message: string;
  hint?: string;
  tone: "info" | "success" | "error";
  action?: { label: string; run: () => void };
};

export type Sheet =
  | { kind: "track-menu"; track: Track; origin: "search" | "queue" | "playlist" | "library"; entryId?: string; playlistId?: string }
  | { kind: "add-to-playlist"; tracks: Track[] }
  | { kind: "create-playlist"; tracks?: Track[] }
  | { kind: "queue" }
  | { kind: "lyrics" }
  | null;

export type State = {
  hydrated: boolean;
  user: PublicUser | null;
  settings: UserSettings;
  favorites: Set<string>;
  playlists: Playlist[];
  playlistsLoaded: boolean;
  youtubeConfigured: boolean;

  /* ---- playback: one source of truth for every surface ---- */
  queue: QueueItem[];
  /** Snapshot taken when shuffle is switched on, restored when switched off. */
  unshuffled: QueueItem[] | null;
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  engineReady: boolean;
  positionSec: number;
  durationSec: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  context: QueueContext;
  playbackError: PlaybackError;
  crossfading: boolean;

  /* ---- UI ---- */
  expanded: boolean;
  sheet: Sheet;
  toasts: Toast[];
  /** Bumped whenever library data changes, so pages know to refetch. */
  revision: number;
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

const initial: State = {
  hydrated: false,
  user: null,
  settings: DEFAULT_SETTINGS,
  favorites: new Set(),
  playlists: [],
  playlistsLoaded: false,
  youtubeConfigured: false,

  queue: [],
  unshuffled: null,
  currentIndex: -1,
  isPlaying: false,
  isBuffering: false,
  engineReady: false,
  positionSec: 0,
  durationSec: 0,
  volume: 100,
  muted: false,
  repeat: "off",
  shuffle: false,
  context: null,
  playbackError: null,
  crossfading: false,

  expanded: false,
  sheet: null,
  toasts: [],
  revision: 0,
};

/* ===================================================================== *
 * Store primitive
 * ===================================================================== */

let state: State = initial;
const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const serverSnapshot = initial;

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(serverSnapshot),
  );
}

// Development-only inspection hook. Handy in the browser console and for
// automated smoke tests; never defined in a production build.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __resonate?: unknown }).__resonate = { getState };
}

export const currentItem = (s: State = state): QueueItem | null =>
  s.currentIndex >= 0 ? (s.queue[s.currentIndex] ?? null) : null;

export const currentTrack = (s: State = state): Track | null => currentItem(s)?.track ?? null;

/* ===================================================================== *
 * Engine binding
 * ===================================================================== */

export type PlayerEngine = {
  load(videoId: string, autoplay: boolean): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  stop(): void;
  /** Tells the engine which track would come next, so it can pre-roll a crossfade. */
  setUpNext(videoId: string | null): void;
};

let engine: PlayerEngine | null = null;
/** Load requested before the engine mounted, replayed once it registers. */
let deferredLoad: { videoId: string; autoplay: boolean } | null = null;

export function registerEngine(e: PlayerEngine | null) {
  engine = e;
  set({ engineReady: Boolean(e) });
  if (!e) return;
  e.setVolume(state.volume);
  e.setMuted(state.muted);
  const pending = deferredLoad ?? (currentTrack() ? { videoId: currentTrack()!.videoId, autoplay: false } : null);
  deferredLoad = null;
  if (pending) {
    e.load(pending.videoId, pending.autoplay);
    updateUpNextHint();
  }
}

/* ===================================================================== *
 * Toasts
 * ===================================================================== */

let toastSeq = 0;

export function toast(
  message: string,
  opts: { tone?: Toast["tone"]; hint?: string; action?: Toast["action"] } = {},
) {
  const id = `t${++toastSeq}`;
  const t: Toast = { id, message, tone: opts.tone ?? "info", hint: opts.hint, action: opts.action };
  set((s) => ({ toasts: [...s.toasts.filter((x) => x.message !== message), t] }));
  setTimeout(() => dismissToast(id), opts.action ? 7000 : 4200);
}

export function dismissToast(id: string) {
  set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

function toastError(err: unknown, fallback = "That didn't work.") {
  const { message, hint } = describeError(err);
  toast(message || fallback, { tone: "error", hint });
}

/* ===================================================================== *
 * Bootstrap / auth
 * ===================================================================== */

type Bootstrap = {
  user: PublicUser | null;
  settings?: UserSettings;
  favoriteIds?: string[];
  queue?: { tracks: Track[]; currentIndex: number; context: QueueContext };
  youtubeConfigured: boolean;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const wrap = (tracks: Track[]): QueueItem[] => tracks.map((track) => ({ qid: uid(), track }));

export async function bootstrap() {
  try {
    const data = await api.get<Bootstrap>("/api/me");
    const settings = data.settings ?? DEFAULT_SETTINGS;
    const restored = data.queue?.tracks?.length ? wrap(data.queue.tracks) : [];
    set({
      hydrated: true,
      user: data.user,
      settings,
      favorites: new Set(data.favoriteIds ?? []),
      youtubeConfigured: data.youtubeConfigured,
      volume: settings.volume,
      repeat: settings.repeatMode,
      shuffle: false, // shuffle is a per-session choice; the saved order is what we restore
      queue: restored,
      // Restore the queue but never auto-start audio: browsers require a gesture.
      currentIndex: restored.length ? Math.min(data.queue?.currentIndex ?? 0, restored.length - 1) : -1,
      context: data.queue?.context ?? null,
    });
    if (restored.length) {
      const idx = Math.min(data.queue?.currentIndex ?? 0, restored.length - 1);
      const item = restored[idx];
      if (item) {
        engine?.load(item.track.videoId, false);
        set({ durationSec: item.track.durationSec });
      }
    }
  } catch (err) {
    set({ hydrated: true });
    if (err instanceof RequestError && err.status !== 401) toastError(err);
  }
}

export async function signIn(email: string, password: string) {
  const { user } = await api.post<{ user: PublicUser }>("/api/auth/login", { email, password });
  set({ user });
  await bootstrap();
  return user;
}

export async function signUp(input: {
  email: string;
  username: string;
  displayName: string;
  password: string;
}) {
  const { user } = await api.post<{ user: PublicUser }>("/api/auth/signup", input);
  set({ user });
  await bootstrap();
  return user;
}

export async function signOut() {
  try {
    await api.post("/api/auth/logout");
  } catch {
    /* clearing local state matters more than the round trip */
  }
  engine?.stop();
  set({
    ...initial,
    hydrated: true,
    youtubeConfigured: state.youtubeConfigured,
    engineReady: state.engineReady,
    favorites: new Set(),
  });
}

/* ===================================================================== *
 * Persistence helpers
 * ===================================================================== */

function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const persistQueue = debounce(() => {
  if (!state.user) return;
  const body = {
    tracks: state.queue.slice(0, 500).map((i) => i.track),
    currentIndex: Math.max(0, state.currentIndex),
    context: state.context,
  };
  api.put("/api/queue", body).catch(() => {
    /* queue persistence is best-effort; local state stays correct */
  });
}, 900);

const persistSettings = debounce((patch: Partial<UserSettings>) => {
  if (!state.user) return;
  api
    .patch<{ settings: UserSettings }>("/api/settings", patch)
    .then(({ settings }) => set({ settings }))
    .catch((err) => toastError(err, "Couldn't save that setting."));
}, 350);

export function updateSettings(patch: Partial<UserSettings>) {
  set((s) => ({ settings: { ...s.settings, ...patch } }));
  if (patch.volume !== undefined) {
    set({ volume: patch.volume });
    engine?.setVolume(patch.volume);
  }
  if (patch.repeatMode !== undefined) set({ repeat: patch.repeatMode });
  persistSettings(patch);
}

/* ===================================================================== *
 * Playback actions
 * ===================================================================== */

function loadCurrent(autoplay: boolean) {
  const item = currentItem();
  if (!item) {
    engine?.stop();
    set({ isPlaying: false, positionSec: 0, durationSec: 0 });
    return;
  }
  set({
    positionSec: 0,
    durationSec: item.track.durationSec,
    playbackError: null,
    isBuffering: autoplay,
  });
  if (engine) engine.load(item.track.videoId, autoplay);
  else deferredLoad = { videoId: item.track.videoId, autoplay };
  updateUpNextHint();
}

function updateUpNextHint() {
  const s = state;
  if (s.settings.crossfadeSec <= 0 || s.repeat === "one") {
    engine?.setUpNext(null);
    return;
  }
  const nextIdx = s.currentIndex + 1;
  const next =
    nextIdx < s.queue.length
      ? s.queue[nextIdx]
      : s.repeat === "all" && s.queue.length > 1
        ? s.queue[0]
        : null;
  engine?.setUpNext(next?.track.videoId ?? null);
}

/** Replaces the queue and starts playing at `startIndex`. */
export function playCollection(tracks: Track[], startIndex: number, context: QueueContext) {
  if (!tracks.length) return;
  const items = wrap(tracks);
  const idx = Math.max(0, Math.min(startIndex, items.length - 1));
  set({ queue: items, unshuffled: null, shuffle: false, currentIndex: idx, context, expanded: state.expanded });
  loadCurrent(true);
  persistQueue();
  recordPlay(items[idx]!.track, context?.type ?? "unknown");
}

/** Plays one track. Honours the "replace queue" preference. */
export function playTrack(track: Track, context: QueueContext = null) {
  if (state.settings.clearQueueOnPlay) {
    playCollection([track], 0, context);
    return;
  }
  const item: QueueItem = { qid: uid(), track };
  set((s) => {
    const at = s.currentIndex + 1;
    const queue = [...s.queue.slice(0, at), item, ...s.queue.slice(at)];
    return { queue, currentIndex: at, context: context ?? s.context, unshuffled: null };
  });
  loadCurrent(true);
  persistQueue();
  recordPlay(track, context?.type ?? "unknown");
}

/** Plays a collection in shuffled order, starting from a random track. */
export function shuffleCollection(tracks: Track[], context: QueueContext) {
  if (!tracks.length) return;
  const items = shuffleArray(wrap(tracks));
  set({ queue: items, unshuffled: null, shuffle: true, currentIndex: 0, context });
  loadCurrent(true);
  persistQueue();
  recordPlay(items[0]!.track, context?.type ?? "unknown");
}

export function addToQueue(tracks: Track[], position: "end" | "next" = state.settings.queueAddPosition) {
  if (!tracks.length) return;
  const items = wrap(tracks);
  const wasEmpty = state.queue.length === 0;
  set((s) => {
    if (position === "next" && s.currentIndex >= 0) {
      const at = s.currentIndex + 1;
      return { queue: [...s.queue.slice(0, at), ...items, ...s.queue.slice(at)] };
    }
    return { queue: [...s.queue, ...items] };
  });
  if (wasEmpty) {
    set({ currentIndex: 0 });
    loadCurrent(false);
  }
  updateUpNextHint();
  persistQueue();
  toast(
    tracks.length === 1
      ? position === "next"
        ? "Playing next"
        : "Added to queue"
      : `${tracks.length} tracks ${position === "next" ? "playing next" : "added to queue"}`,
    { tone: "success" },
  );
}

export const playNext = (tracks: Track[]) => addToQueue(tracks, "next");

export function removeFromQueue(qid: string) {
  const s = state;
  const idx = s.queue.findIndex((i) => i.qid === qid);
  if (idx < 0) return;
  const removed = s.queue[idx]!;
  const isCurrent = idx === s.currentIndex;
  const queue = s.queue.filter((i) => i.qid !== qid);
  let currentIndex = s.currentIndex;
  if (idx < s.currentIndex) currentIndex -= 1;
  else if (isCurrent) currentIndex = Math.min(s.currentIndex, queue.length - 1);

  set({
    queue,
    currentIndex: queue.length ? currentIndex : -1,
    unshuffled: s.unshuffled?.filter((i) => i.qid !== qid) ?? null,
  });

  if (!queue.length) {
    engine?.stop();
    set({ isPlaying: false, positionSec: 0, durationSec: 0 });
  } else if (isCurrent) {
    loadCurrent(s.isPlaying);
  } else {
    updateUpNextHint();
  }
  persistQueue();

  toast("Removed from queue", {
    action: {
      label: "Undo",
      run: () => {
        set((cur) => {
          const at = Math.min(idx, cur.queue.length);
          const queue2 = [...cur.queue.slice(0, at), removed, ...cur.queue.slice(at)];
          const ci = cur.currentIndex >= at ? cur.currentIndex + 1 : cur.currentIndex;
          return { queue: queue2, currentIndex: cur.currentIndex < 0 ? at : ci };
        });
        persistQueue();
      },
    },
  });
}

export function clearQueue() {
  const s = state;
  const keep = currentItem(s);
  // Keep whatever is playing; clearing "Up Next" shouldn't stop the music.
  set({
    queue: keep ? [keep] : [],
    currentIndex: keep ? 0 : -1,
    unshuffled: null,
  });
  updateUpNextHint();
  persistQueue();
  toast(keep ? "Cleared everything after the current track" : "Queue cleared", { tone: "success" });
}

export function moveQueueItem(from: number, to: number) {
  const s = state;
  if (from === to || from < 0 || to < 0 || from >= s.queue.length || to >= s.queue.length) return;
  const queue = [...s.queue];
  const [moved] = queue.splice(from, 1);
  if (!moved) return;
  queue.splice(to, 0, moved);

  let currentIndex = s.currentIndex;
  if (from === s.currentIndex) currentIndex = to;
  else if (from < s.currentIndex && to >= s.currentIndex) currentIndex -= 1;
  else if (from > s.currentIndex && to <= s.currentIndex) currentIndex += 1;

  set({ queue, currentIndex, unshuffled: null });
  updateUpNextHint();
  persistQueue();
}

export function jumpTo(index: number) {
  if (index < 0 || index >= state.queue.length) return;
  set({ currentIndex: index });
  loadCurrent(true);
  persistQueue();
  const t = state.queue[index];
  if (t) recordPlay(t.track, state.context?.type ?? "queue");
}

export function jumpToQid(qid: string) {
  const idx = state.queue.findIndex((i) => i.qid === qid);
  if (idx >= 0) jumpTo(idx);
}

export function togglePlay() {
  if (state.currentIndex < 0) return;
  if (state.isPlaying) {
    engine?.pause();
  } else {
    engine?.play();
  }
}

export function next(auto = false) {
  const s = state;
  if (!s.queue.length) return;

  if (auto && s.repeat === "one") {
    engine?.seek(0);
    engine?.play();
    return;
  }

  const last = s.queue.length - 1;
  if (s.currentIndex >= last) {
    if (s.repeat === "all") {
      set({ currentIndex: 0 });
      loadCurrent(true);
      persistQueue();
      const t = s.queue[0];
      if (t) recordPlay(t.track, s.context?.type ?? "queue");
      return;
    }
    // End of queue: stop cleanly, keep the last track on screen.
    engine?.pause();
    engine?.seek(0);
    set({ isPlaying: false, positionSec: 0 });
    if (auto && s.settings.notifyQueueEnd) notifyQueueEnd();
    return;
  }

  const idx = s.currentIndex + 1;
  set({ currentIndex: idx });
  loadCurrent(true);
  persistQueue();
  const t = s.queue[idx];
  if (t) recordPlay(t.track, s.context?.type ?? "queue");
}

export function previous() {
  const s = state;
  if (!s.queue.length) return;
  // Standard music-player behaviour: restart the track unless we're near the top.
  if (s.positionSec > 3) {
    engine?.seek(0);
    set({ positionSec: 0 });
    return;
  }
  if (s.currentIndex <= 0) {
    if (s.repeat === "all" && s.queue.length > 1) {
      const idx = s.queue.length - 1;
      set({ currentIndex: idx });
      loadCurrent(true);
      persistQueue();
      return;
    }
    engine?.seek(0);
    set({ positionSec: 0 });
    return;
  }
  const idx = s.currentIndex - 1;
  set({ currentIndex: idx });
  loadCurrent(true);
  persistQueue();
  const t = s.queue[idx];
  if (t) recordPlay(t.track, s.context?.type ?? "queue");
}

export function seek(seconds: number) {
  const clamped = Math.max(0, Math.min(seconds, state.durationSec || seconds));
  engine?.seek(clamped);
  set({ positionSec: clamped });
}

export function setVolume(v: number) {
  const volume = Math.max(0, Math.min(100, Math.round(v)));
  set({ volume, muted: volume === 0 ? state.muted : false });
  engine?.setVolume(volume);
  if (volume > 0) engine?.setMuted(false);
  persistSettings({ volume });
  set((s) => ({ settings: { ...s.settings, volume } }));
}

export function toggleMute() {
  const muted = !state.muted;
  set({ muted });
  engine?.setMuted(muted);
}

export function cycleRepeat() {
  const order: RepeatMode[] = ["off", "all", "one"];
  const repeat = order[(order.indexOf(state.repeat) + 1) % order.length]!;
  set({ repeat });
  updateSettings({ repeatMode: repeat });
  updateUpNextHint();
  toast(
    repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeating queue" : "Repeating this track",
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function toggleShuffle() {
  const s = state;
  if (!s.shuffle) {
    // Shuffle only what hasn't played yet, so the current track keeps playing.
    const head = s.queue.slice(0, s.currentIndex + 1);
    const tail = shuffleArray(s.queue.slice(s.currentIndex + 1));
    set({ shuffle: true, unshuffled: s.queue, queue: [...head, ...tail] });
    toast("Shuffling up next");
  } else {
    const original = s.unshuffled;
    if (original) {
      const cur = currentItem(s);
      const idx = cur ? original.findIndex((i) => i.qid === cur.qid) : -1;
      set({
        shuffle: false,
        queue: original,
        unshuffled: null,
        currentIndex: idx >= 0 ? idx : s.currentIndex,
      });
    } else {
      set({ shuffle: false });
    }
    toast("Shuffle off");
  }
  updateSettings({ shuffle: state.shuffle });
  updateUpNextHint();
  persistQueue();
}

/**
 * Posts a real system notification when the queue runs dry, falling back to an
 * in-app message when the browser has no Notifications API or permission was
 * refused. Never asks for permission here — that happens in Settings, on a
 * deliberate tap.
 */
function notifyQueueEnd() {
  const body = "Resonate reached the end of your queue.";
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Playback finished", { body, tag: "resonate-queue-end" });
      return;
    }
  } catch {
    /* some browsers throw when constructing notifications in a background tab */
  }
  toast("That's the end of your queue", { tone: "info" });
}

/* ---- engine callbacks ---- */

export const engineEvents = {
  ready() {
    set({ engineReady: true });
    engine?.setVolume(state.volume);
  },
  playing() {
    set({ isPlaying: true, isBuffering: false, playbackError: null });
  },
  paused() {
    set({ isPlaying: false, isBuffering: false });
  },
  buffering() {
    set({ isBuffering: true });
  },
  ended() {
    next(true);
  },
  progress(positionSec: number, durationSec: number) {
    set((s) => ({
      positionSec,
      durationSec: durationSec > 0 ? durationSec : s.durationSec,
    }));
  },
  crossfadeStart() {
    set({ crossfading: true });
  },
  /** The engine finished a crossfade and is now playing the next track. */
  crossfadeComplete() {
    set({ crossfading: false });
    const s = state;
    const last = s.queue.length - 1;
    const idx = s.currentIndex >= last ? 0 : s.currentIndex + 1;
    set({ currentIndex: idx, positionSec: 0 });
    const item = s.queue[idx];
    if (item) {
      set({ durationSec: item.track.durationSec });
      recordPlay(item.track, s.context?.type ?? "queue");
    }
    updateUpNextHint();
    persistQueue();
  },
  /**
   * The engine asked the player to start and it never did. Covers blocked
   * autoplay, an embed the browser refuses to configure, and dead-stalled
   * network — none of which raise an IFrame API error code.
   */
  stalled() {
    if (state.isPlaying) return;
    set({
      isBuffering: false,
      playbackError: {
        code: "DID_NOT_START",
        message: "This track didn't start playing.",
        hint: "Your browser may be blocking the embedded player, or the video's owner may have restricted playback here. Press play again, or open it on YouTube from the ••• menu.",
      },
    });
  },
  error(code: number) {
    const track = currentTrack();
    const info = describePlaybackError(code);
    set({ isPlaying: false, isBuffering: false, crossfading: false, playbackError: info });
    toast(info.message, { tone: "error", hint: info.hint });
    // Don't get stuck on a dead video when there's more queued up.
    if (state.queue.length > 1 && state.settings.autoplay) {
      setTimeout(() => {
        if (currentTrack()?.videoId === track?.videoId) next(true);
      }, 2200);
    }
  },
};

function describePlaybackError(code: number): NonNullable<PlaybackError> {
  switch (code) {
    case 2:
      return {
        code: "INVALID_ID",
        message: "This track's video id isn't valid.",
        hint: "It may have been mistyped or the video was replaced.",
      };
    case 5:
      return {
        code: "HTML5_ERROR",
        message: "The player couldn't start this video.",
        hint: "Reloading the page usually clears this up.",
      };
    case 100:
      return {
        code: "NOT_FOUND",
        message: "This video has been removed or made private.",
        hint: "Remove it from your playlist to stop it coming back.",
      };
    case 101:
    case 150:
      return {
        code: "EMBED_BLOCKED",
        message: "The owner doesn't allow this video to play outside YouTube.",
        hint: "Open it on YouTube from the ••• menu to watch it there.",
      };
    default:
      return { code: "UNKNOWN", message: "This track wouldn't play.", hint: "Skipping to the next one." };
  }
}

/* ===================================================================== *
 * Library actions
 * ===================================================================== */

let historyGuard = "";

function recordPlay(track: Track, source: string) {
  if (!state.user || !state.settings.saveHistory) return;
  const stamp = `${track.videoId}:${Math.floor(Date.now() / 30_000)}`;
  if (historyGuard === stamp) return;
  historyGuard = stamp;
  api.post("/api/history", { track, source }).catch(() => {
    /* history is non-critical */
  });
}

export function isFavorite(videoId: string, s: State = state): boolean {
  return s.favorites.has(videoId);
}

export async function toggleFavorite(track: Track) {
  if (!state.user) {
    toast("Sign in to save favorites", { tone: "info" });
    return;
  }
  const on = !state.favorites.has(track.videoId);
  const optimistic = new Set(state.favorites);
  if (on) optimistic.add(track.videoId);
  else optimistic.delete(track.videoId);
  const previousFavorites = state.favorites;
  set({ favorites: optimistic });

  try {
    const res = await api.post<{ favoriteIds: string[] }>("/api/favorites", { track, favorite: on });
    set((s) => ({ favorites: new Set(res.favoriteIds), revision: s.revision + 1 }));
    toast(on ? "Saved to Favorites" : "Removed from Favorites", { tone: "success" });
  } catch (err) {
    set({ favorites: previousFavorites });
    toastError(err, "Couldn't update favorites.");
  }
}

export async function loadPlaylists(sort = "recent") {
  if (!state.user) return;
  try {
    const { playlists } = await api.get<{ playlists: Playlist[] }>(`/api/playlists?sort=${sort}`);
    set({ playlists, playlistsLoaded: true });
  } catch (err) {
    set({ playlistsLoaded: true });
    toastError(err, "Couldn't load your playlists.");
  }
}

export async function createPlaylist(name: string, tracks?: Track[]) {
  const { playlist } = await api.post<{ playlist: Playlist }>("/api/playlists", {
    name,
    description: "",
    tracks,
  });
  set((s) => ({ playlists: [playlist, ...s.playlists], revision: s.revision + 1 }));
  toast(
    tracks?.length ? `Created "${playlist.name}" with ${tracks.length} track${tracks.length === 1 ? "" : "s"}` : `Created "${playlist.name}"`,
    { tone: "success" },
  );
  return playlist;
}

export async function addTracksToPlaylist(playlistId: string, tracks: Track[]) {
  const res = await api.post<{ added: number; skipped: number }>(
    `/api/playlists/${playlistId}/tracks`,
    { tracks },
  );
  await loadPlaylists();
  bumpRevision();
  const name = state.playlists.find((p) => p.id === playlistId)?.name ?? "playlist";
  if (res.added === 0) {
    toast(
      tracks.length === 1 ? `Already in "${name}"` : `All ${tracks.length} tracks were already in "${name}"`,
      { tone: "info" },
    );
  } else {
    toast(`Added ${res.added} to "${name}"`, {
      tone: "success",
      hint: res.skipped ? `${res.skipped} already there` : undefined,
    });
  }
  return res;
}

/* ===================================================================== *
 * UI actions
 * ===================================================================== */

export const bumpRevision = () => set((s) => ({ revision: s.revision + 1 }));

export const openSheet = (sheet: Sheet) => set({ sheet });
export const closeSheet = () => set({ sheet: null });
export const setExpanded = (expanded: boolean) => set({ expanded });
export const setPlaylists = (playlists: Playlist[]) => set({ playlists, playlistsLoaded: true });

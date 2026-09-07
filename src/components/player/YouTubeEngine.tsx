"use client";

import { useEffect, useRef, useState } from "react";
import { engineEvents, getState, registerEngine, type PlayerEngine } from "@/lib/store";

/* ------------------------------------------------------------------ *
 * Minimal typings for the official IFrame Player API.
 * Docs: https://developers.google.com/youtube/iframe_api_reference
 * ------------------------------------------------------------------ */

type YTPlayer = {
  loadVideoById(id: string, start?: number): void;
  cueVideoById(id: string, start?: number): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(v: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads https://www.youtube.com/iframe_api exactly once per page. */
function loadIframeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const timeout = setTimeout(
      () => reject(new Error("The YouTube player script didn't load.")),
      15_000,
    );
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("The YouTube player script loaded but exposed no player."));
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const s = document.createElement("script");
      s.id = "youtube-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("The YouTube player script was blocked."));
      };
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}

const PLAYER_VARS = {
  autoplay: 0,
  controls: 0,
  disablekb: 1,
  enablejsapi: 1,
  fs: 0,
  iv_load_policy: 3,
  modestbranding: 1,
  playsinline: 1,
  rel: 0,
} as const;

type Deck = {
  player: YTPlayer | null;
  ready: boolean;
  videoId: string | null;
  /** Set while this deck is only being used as the incoming side of a fade. */
  fading: boolean;
};

/**
 * Renders the two official IFrame players that back all playback, and exposes
 * them to the store as a single `PlayerEngine`.
 *
 * Deck B exists only so crossfade can be real: two official embeds overlap for
 * the fade duration and their volumes are ramped in opposite directions. No
 * audio is intercepted, decoded, downloaded or routed anywhere — each deck is
 * an ordinary YouTube embed doing ordinary playback.
 */
export default function YouTubeEngine({ className }: { className?: string }) {
  const hostA = useRef<HTMLDivElement>(null);
  const hostB = useRef<HTMLDivElement>(null);
  const decks = useRef<[Deck, Deck]>([
    { player: null, ready: false, videoId: null, fading: false },
    { player: null, ready: false, videoId: null, fading: false },
  ]);
  const active = useRef<0 | 1>(0);
  const upNext = useRef<string | null>(null);
  const crossfade = useRef<{ timer: number } | null>(null);
  const pendingLoad = useRef<{ videoId: string; autoplay: boolean } | null>(null);
  /**
   * Watchdog for "we asked it to play and it never did". The at field slides
   * forward while the player genuinely buffers; since is an absolute ceiling,
   * so a player wedged in BUFFERING forever still reports back.
   */
  const playIntent = useRef<{ at: number; since: number } | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [visibleDeck, setVisibleDeck] = useState<0 | 1>(0);

  useEffect(() => {
    let disposed = false;

    const targetVolume = () => (getState().muted ? 0 : getState().volume);

    const stopCrossfade = (restoreActive: boolean) => {
      const cf = crossfade.current;
      if (!cf) return;
      window.clearInterval(cf.timer);
      crossfade.current = null;
      const idle = decks.current[active.current === 0 ? 1 : 0];
      idle.fading = false;
      try {
        idle.player?.stopVideo();
      } catch {
        /* deck may already be gone */
      }
      if (restoreActive) {
        try {
          decks.current[active.current].player?.setVolume(targetVolume());
        } catch {
          /* ignore */
        }
      }
    };

    const beginCrossfade = (seconds: number, nextVideoId: string) => {
      const from = decks.current[active.current];
      const toIdx: 0 | 1 = active.current === 0 ? 1 : 0;
      const to = decks.current[toIdx];
      if (!from.player || !to.player || !to.ready) return false;

      const vol = targetVolume();
      to.fading = true;
      try {
        to.player.loadVideoById(nextVideoId, 0);
        to.player.setVolume(0);
        to.player.playVideo();
      } catch {
        to.fading = false;
        return false;
      }

      engineEvents.crossfadeStart();
      setVisibleDeck(toIdx);
      const startedAt = performance.now();
      let confirmedPlaying = false;

      const timer = window.setInterval(() => {
        const cf = crossfade.current;
        if (!cf || disposed) return;
        const elapsed = (performance.now() - startedAt) / 1000;

        if (!confirmedPlaying) {
          let st = STATE.UNSTARTED;
          try {
            st = to.player!.getPlayerState();
          } catch {
            /* not ready yet */
          }
          if (st === STATE.PLAYING) confirmedPlaying = true;
          // Autoplay of the incoming deck was refused — fall back to a hard cut.
          else if (elapsed > 2.5) {
            window.clearInterval(timer);
            crossfade.current = null;
            to.fading = false;
            setVisibleDeck(active.current);
            try {
              to.player!.stopVideo();
              from.player!.setVolume(vol);
            } catch {
              /* ignore */
            }
            return;
          }
        }

        const t = Math.min(1, elapsed / seconds);
        const eased = t * t * (3 - 2 * t); // smoothstep keeps the fade from sounding linear
        try {
          from.player!.setVolume(Math.round(vol * (1 - eased)));
          to.player!.setVolume(Math.round(vol * eased));
        } catch {
          /* ignore transient errors */
        }

        if (t >= 1) {
          window.clearInterval(timer);
          crossfade.current = null;
          to.fading = false;
          try {
            from.player!.stopVideo();
            from.player!.setVolume(vol);
          } catch {
            /* ignore */
          }
          active.current = toIdx;
          to.videoId = nextVideoId;
          from.videoId = null;
          setVisibleDeck(toIdx);
          engineEvents.crossfadeComplete();
        }
      }, 60);

      crossfade.current = { timer };
      return true;
    };

    const makeEngine = (): PlayerEngine => ({
      load(videoId, autoplay) {
        stopCrossfade(true);
        setVisibleDeck(active.current);
        const deck = decks.current[active.current];
        if (!deck.ready || !deck.player) {
          pendingLoad.current = { videoId, autoplay };
          return;
        }
        deck.videoId = videoId;
        const startedAt = performance.now();
        playIntent.current = autoplay ? { at: startedAt, since: startedAt } : null;
        try {
          deck.player.setVolume(targetVolume());
          if (autoplay) deck.player.loadVideoById(videoId, 0);
          else deck.player.cueVideoById(videoId, 0);
        } catch {
          pendingLoad.current = { videoId, autoplay };
        }
      },
      play() {
        const now = performance.now();
        playIntent.current = { at: now, since: playIntent.current?.since ?? now };
        decks.current[active.current].player?.playVideo();
      },
      pause() {
        playIntent.current = null;
        stopCrossfade(true);
        decks.current[active.current].player?.pauseVideo();
      },
      seek(seconds) {
        stopCrossfade(true);
        decks.current[active.current].player?.seekTo(seconds, true);
      },
      setVolume(v) {
        if (crossfade.current) return; // the ramp owns the volume mid-fade
        try {
          decks.current[active.current].player?.setVolume(getState().muted ? 0 : v);
        } catch {
          /* ignore */
        }
      },
      setMuted(muted) {
        const p = decks.current[active.current].player;
        try {
          if (muted) p?.mute();
          else {
            p?.unMute();
            p?.setVolume(getState().volume);
          }
        } catch {
          /* ignore */
        }
      },
      stop() {
        playIntent.current = null;
        stopCrossfade(false);
        for (const d of decks.current) {
          try {
            d.player?.stopVideo();
          } catch {
            /* ignore */
          }
          d.videoId = null;
        }
      },
      setUpNext(videoId) {
        upNext.current = videoId;
      },
    });

    const onStateChange = (deckIndex: 0 | 1) => (e: { data: number }) => {
      // Only the deck currently driving playback may steer the store.
      if (deckIndex !== active.current) return;
      switch (e.data) {
        case STATE.PLAYING:
          playIntent.current = null;
          engineEvents.playing();
          break;
        case STATE.PAUSED:
          if (!crossfade.current) engineEvents.paused();
          break;
        case STATE.BUFFERING:
          engineEvents.buffering();
          break;
        case STATE.ENDED:
          if (!crossfade.current) engineEvents.ended();
          break;
        default:
          break;
      }
    };

    loadIframeApi()
      .then((YT) => {
        if (disposed) return;
        // The API *replaces* the element it is given with an <iframe>. We hand
        // it a node we create ourselves so React never owns the replaced child
        // and unmounting can't hit a removeChild on a detached node.
        const build = (host: HTMLDivElement, index: 0 | 1) => {
          const mount = document.createElement("div");
          mount.style.width = "100%";
          mount.style.height = "100%";
          host.appendChild(mount);
          return new YT.Player(mount, {
            playerVars: { ...PLAYER_VARS },
            events: {
              onReady: (ev) => {
                const deck = decks.current[index];
                deck.player = ev.target;
                deck.ready = true;
                try {
                  ev.target.setVolume(getState().muted ? 0 : getState().volume);
                } catch {
                  /* ignore */
                }
                if (index === active.current) {
                  engineEvents.ready();
                  const pending = pendingLoad.current;
                  if (pending) {
                    pendingLoad.current = null;
                    deck.videoId = pending.videoId;
                    if (pending.autoplay) ev.target.loadVideoById(pending.videoId, 0);
                    else ev.target.cueVideoById(pending.videoId, 0);
                  }
                }
              },
              onStateChange: onStateChange(index),
              onError: (ev) => {
                if (index === active.current) engineEvents.error(ev.data);
                else stopCrossfade(true);
              },
            },
          });
        };

        if (hostA.current) build(hostA.current, 0);
        if (hostB.current) build(hostB.current, 1);
        registerEngine(makeEngine());
      })
      .catch((err: Error) => {
        if (!disposed) setScriptError(err.message);
      });

    /* ---- progress + crossfade scheduler ---- */
    const tick = window.setInterval(() => {
      const deck = decks.current[active.current];
      if (!deck.player || !deck.ready) return;
      let position = 0;
      let duration = 0;
      try {
        position = deck.player.getCurrentTime() || 0;
        duration = deck.player.getDuration() || 0;
      } catch {
        return;
      }
      if (!crossfade.current) engineEvents.progress(position, duration);

      // Nothing started within 9s of asking: tell the user instead of
      // spinning forever. Buffering keeps the watchdog alive.
      const intent = playIntent.current;
      if (intent) {
        let playerState = STATE.UNSTARTED;
        try {
          playerState = deck.player.getPlayerState();
        } catch {
          /* transient */
        }
        const now = performance.now();
        if (playerState === STATE.BUFFERING) intent.at = now;
        if (now - intent.at > 9000 || now - intent.since > 25000) {
          playIntent.current = null;
          engineEvents.stalled();
        }
      }

      const s = getState();
      const fade = s.settings.crossfadeSec;
      if (
        fade > 0 &&
        !crossfade.current &&
        upNext.current &&
        duration > fade + 2 &&
        position > 1 &&
        duration - position <= fade &&
        s.isPlaying
      ) {
        beginCrossfade(fade, upNext.current);
      }
    }, 250);

    return () => {
      disposed = true;
      window.clearInterval(tick);
      if (crossfade.current) window.clearInterval(crossfade.current.timer);
      registerEngine(null);
      for (const d of decks.current) {
        try {
          d.player?.destroy();
        } catch {
          /* ignore */
        }
        d.player = null;
        d.ready = false;
      }
    };
  }, []);

  if (scriptError) {
    return (
      <div className={className}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface-2)] p-4 text-center">
          <p className="text-sm font-medium text-[var(--text)]">Playback is unavailable</p>
          <p className="text-xs text-[var(--text-dim)]">
            {scriptError} Playback needs youtube.com to be reachable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: visibleDeck === 0 ? 1 : 0 }}
      >
        <div ref={hostA} className="h-full w-full" />
      </div>
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: visibleDeck === 1 ? 1 : 0 }}
      >
        <div ref={hostB} className="h-full w-full" />
      </div>
    </div>
  );
}

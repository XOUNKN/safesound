"use client";

import { useEffect } from "react";
import { cleanArtist, cleanTitle } from "@/lib/format";
import {
  currentTrack,
  next,
  previous,
  seek,
  togglePlay,
  useStore,
} from "@/lib/store";

/**
 * Publishes what's playing to the OS media controls — lock screen, keyboard
 * media keys, browser tab controls — using the standard Media Session API.
 * Renders nothing. Silently does nothing where the API is unsupported.
 */
export default function MediaSession() {
  const track = useStore(currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const positionSec = useStore((s) => s.positionSec);
  const durationSec = useStore((s) => s.durationSec);
  const queueLength = useStore((s) => s.queue.length);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    if (!track) {
      ms.metadata = null;
      ms.playbackState = "none";
      return;
    }

    ms.metadata = new MediaMetadata({
      title: cleanTitle(track.title),
      artist: cleanArtist(track.channelTitle),
      album: "Resonate",
      artwork: [96, 128, 192, 256, 384, 512].map((size) => ({
        src: track.thumbnailUrl ?? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
        sizes: `${size}x${size}`,
        type: "image/jpeg",
      })),
    });
  }, [track]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Not every browser supports every action; skipping one is fine.
      }
    };

    set("play", () => togglePlay());
    set("pause", () => togglePlay());
    set("previoustrack", () => previous());
    set("nexttrack", queueLength > 1 ? () => next(false) : null);
    set("seekbackward", (d) => seek(Math.max(0, positionSec - (d.seekOffset ?? 10))));
    set("seekforward", (d) => seek(positionSec + (d.seekOffset ?? 10)));
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") seek(d.seekTime);
    });

    return () => {
      for (const a of [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekbackward",
        "seekforward",
        "seekto",
      ] as MediaSessionAction[]) {
        set(a, null);
      }
    };
  }, [positionSec, queueLength]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!durationSec || durationSec <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: durationSec,
        position: Math.min(positionSec, durationSec),
        playbackRate: 1,
      });
    } catch {
      // Throws if position exceeds duration mid-transition; harmless.
    }
  }, [positionSec, durationSec]);

  return null;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { cleanArtist, cleanTitle, formatDuration } from "@/lib/format";
import {
  currentTrack,
  cycleRepeat,
  next,
  openSheet,
  previous,
  seek,
  setExpanded,
  setVolume,
  toggleFavorite,
  toggleMute,
  togglePlay,
  toggleShuffle,
  useStore,
} from "@/lib/store";
import {
  IconChevronDown,
  IconExternal,
  IconHeart,
  IconLyrics,
  IconNext,
  IconPause,
  IconPlay,
  IconPlaylist,
  IconPrev,
  IconQueue,
  IconRepeat,
  IconRepeatOne,
  IconShuffle,
  IconVolume,
} from "@/components/ui/Icons";
import { IconButton, Spinner } from "@/components/ui/primitives";
import { Artwork } from "@/components/track/Artwork";
import YouTubeEngine from "./YouTubeEngine";

/**
 * The single persistent player surface. The full-width bottom bar and the full
 * Now Playing screen are the *same* element tree with different CSS, so
 * expanding never unmounts the YouTube iframe and playback continues.
 */
export default function PlayerDock({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const track = useStore(currentTrack);
  const expanded = useStore((s) => s.expanded);
  const hasQueue = useStore((s) => s.queue.length > 0);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  // Always mounted, even with an empty queue, so the first loadVideoById lands
  // inside the user's click. Browsers refuse to start audio outside a gesture.
  const visible = hasQueue && Boolean(track);
  const dockLeft = sidebarCollapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)";

  return (
    <>
      {expanded && visible && (
        <div
          className="animate-fade fixed inset-0 z-[59] bg-[var(--bg)]"
          aria-hidden="true"
          style={{ backgroundImage: "radial-gradient(120% 80% at 50% 0%, var(--accent-soft), transparent 68%)" }}
        />
      )}
      <div
        aria-hidden={visible ? undefined : true}
        inert={!visible}
        style={{ ["--dock-left" as string]: dockLeft }}
        className={
          expanded && visible
            ? "fixed inset-0 z-[60] flex flex-col justify-center overflow-y-auto overscroll-contain"
            : `pb-safe fixed right-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom,0px))] left-0 z-[60] flex h-[var(--mini-h)] items-center gap-3 border-t border-[var(--border-soft)] bg-[var(--player-bg)] px-3 transition-[transform,opacity] duration-300 sm:gap-4 sm:px-4 lg:bottom-0 lg:left-[var(--dock-left)] ${
                visible ? "" : "pointer-events-none translate-y-[200%] opacity-0"
              }`
        }
      >
        {!expanded && visible && <MiniProgressLine />}
        <ExpandedHeader expanded={expanded && visible} />
        <Stage expanded={expanded && visible} />
        <Meta expanded={expanded && visible} />
        <Controls expanded={expanded && visible} />
        <Extras expanded={expanded && visible} />
      </div>
    </>
  );
}

/** Thin gradient progress line pinned to the top edge of the mini bar. */
function MiniProgressLine() {
  const position = useStore((s) => s.positionSec);
  const duration = useStore((s) => s.durationSec);
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-[var(--surface-4)]">
      <div className="brand-gradient h-full" style={{ width: `${pct}%` }} aria-hidden="true" />
    </div>
  );
}

/* ------------------------------- header ------------------------------- */

function ExpandedHeader({ expanded }: { expanded: boolean }) {
  const context = useStore((s) => s.context);
  return (
    <div
      className={
        expanded
          ? "pt-safe absolute inset-x-0 top-0 flex shrink-0 items-center justify-between gap-3 px-3 pt-3 pb-1 sm:px-6"
          : "hidden"
      }
    >
      <IconButton label="Minimise player" onClick={() => setExpanded(false)}>
        <IconChevronDown size={24} />
      </IconButton>
      <div className="min-w-0 text-center">
        <p className="eyebrow">{context ? "Playing from" : "Now playing"}</p>
        {context && (
          <p className="mt-0.5 truncate text-[0.8125rem] font-medium text-[var(--text)]">
            {context.name}
          </p>
        )}
      </div>
      <span className="w-10" />
    </div>
  );
}

/* -------------------------------- stage ------------------------------- */

function Stage({ expanded }: { expanded: boolean }) {
  const isBuffering = useStore((s) => s.isBuffering);
  const crossfading = useStore((s) => s.crossfading);
  const setExpandedIfMini = () => {
    if (!expanded) setExpanded(true);
  };

  return (
    <div
      className={
        expanded
          ? "mx-auto w-full max-w-[min(80vw,26rem)] shrink-0 px-4 sm:px-0 lg:max-w-[34rem]"
          : "shrink-0"
      }
    >
      <div
        role={expanded ? undefined : "button"}
        tabIndex={expanded ? -1 : 0}
        onClick={setExpandedIfMini}
        onKeyDown={(e) => {
          if (!expanded && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        aria-label={expanded ? undefined : "Open the full player"}
        className={`yt-stage relative overflow-hidden bg-black ${
          expanded
            ? "aspect-video w-full rounded-[var(--r-lg)] shadow-[var(--shadow-lg)]"
            : "h-11 w-11 cursor-pointer rounded-[var(--r-sm)]"
        }`}
      >
        <YouTubeEngine className="absolute inset-0" />
        {(isBuffering || crossfading) && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 text-white">
            {crossfading ? (
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[0.625rem] font-bold tracking-wide uppercase">
                Crossfading
              </span>
            ) : (
              <Spinner size={expanded ? 30 : 16} />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- meta -------------------------------- */

function Meta({ expanded }: { expanded: boolean }) {
  const track = useStore(currentTrack);
  const isFav = useStore((s) => (track ? s.favorites.has(track.videoId) : false));
  if (!track) return null;

  const title = cleanTitle(track.title);
  const artist = cleanArtist(track.channelTitle);

  if (!expanded) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 lg:w-[22%] lg:min-w-[180px]">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Open full player. Now playing ${title} by ${artist}`}
        >
          <span className="block truncate text-[0.8125rem] leading-tight font-semibold text-[var(--text)]">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] leading-tight text-[var(--text-dim)]">
            {artist}
          </span>
        </button>
        <IconButton
          label={isFav ? "Remove from Favorites" : "Save to Favorites"}
          active={isFav}
          onClick={() => void toggleFavorite(track)}
          size={34}
          className="hidden shrink-0 sm:inline-grid"
        >
          <IconHeart size={18} filled={isFav} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[min(80vw,26rem)] shrink-0 px-4 pt-6 sm:px-0 lg:max-w-[34rem]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
          <p className="mt-1 truncate text-[0.9375rem] text-[var(--text-dim)]">{artist}</p>
        </div>
        <IconButton
          label={isFav ? "Remove from Favorites" : "Save to Favorites"}
          active={isFav}
          onClick={() => void toggleFavorite(track)}
          className="mt-0.5 shrink-0"
        >
          <IconHeart size={23} filled={isFav} />
        </IconButton>
      </div>
    </div>
  );
}

/* ------------------------------ controls ------------------------------ */

function Controls({ expanded }: { expanded: boolean }) {
  const isPlaying = useStore((s) => s.isPlaying);
  const isBuffering = useStore((s) => s.isBuffering);
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const queueLen = useStore((s) => s.queue.length);

  if (!expanded) {
    return (
      <div className="flex flex-1 items-center justify-end gap-1 lg:flex-col lg:justify-center lg:gap-1.5">
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous track"
            onClick={previous}
            size={36}
            className="hidden text-[var(--text)] lg:inline-grid"
          >
            <IconPrev size={20} />
          </IconButton>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--text)] text-[#0a0a0a] transition-transform active:scale-95"
          >
            {isBuffering && !isPlaying ? (
              <Spinner size={18} className="text-[#0a0a0a]" />
            ) : isPlaying ? (
              <IconPause size={18} />
            ) : (
              <IconPlay size={18} className="ml-0.5" />
            )}
          </button>
          <IconButton
            label="Next track"
            onClick={() => next(false)}
            size={36}
            disabled={queueLen < 2}
            className="text-[var(--text)]"
          >
            <IconNext size={20} />
          </IconButton>
        </div>
        {/* Inline scrubber under the transport, desktop only. */}
        <div className="hidden w-full max-w-[520px] items-center gap-2 lg:flex">
          <Progress compact />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[min(80vw,26rem)] shrink-0 px-4 sm:px-0 lg:max-w-[34rem]">
      <Progress />
      <div className="mt-4 flex items-center justify-between">
        <IconButton label={shuffle ? "Shuffle on" : "Shuffle off"} active={shuffle} onClick={toggleShuffle}>
          <IconShuffle size={21} />
        </IconButton>
        <IconButton label="Previous track" onClick={previous} size={48} className="text-[var(--text)]">
          <IconPrev size={30} />
        </IconButton>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="brand-gradient grid h-16 w-16 place-items-center rounded-full text-[var(--on-accent)] shadow-[var(--shadow-lg)] transition-transform duration-150 active:scale-95"
        >
          {isBuffering && !isPlaying ? (
            <Spinner size={26} className="text-[var(--on-accent)]" />
          ) : isPlaying ? (
            <IconPause size={28} />
          ) : (
            <IconPlay size={28} className="ml-0.5" />
          )}
        </button>
        <IconButton
          label="Next track"
          onClick={() => next(false)}
          size={48}
          disabled={queueLen < 2}
          className="text-[var(--text)]"
        >
          <IconNext size={30} />
        </IconButton>
        <IconButton
          label={repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat queue" : "Repeat this track"}
          active={repeat !== "off"}
          onClick={cycleRepeat}
        >
          {repeat === "one" ? <IconRepeatOne size={21} /> : <IconRepeat size={21} />}
        </IconButton>
      </div>
    </div>
  );
}

function Progress({ compact }: { compact?: boolean }) {
  const position = useStore((s) => s.positionSec);
  const duration = useStore((s) => s.durationSec);
  const [scrub, setScrub] = useState<number | null>(null);

  const value = scrub ?? position;
  const max = duration > 0 ? duration : 0;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const input = (
    <input
      type="range"
      className="track-range"
      min={0}
      max={max || 1}
      step={0.5}
      value={Math.min(value, max || 1)}
      disabled={max <= 0}
      style={{ ["--fill" as string]: `${pct}%` }}
      aria-label="Seek"
      aria-valuetext={`${formatDuration(value)} of ${formatDuration(max)}`}
      onChange={(e) => setScrub(Number(e.target.value))}
      onPointerUp={() => {
        if (scrub !== null) seek(scrub);
        setScrub(null);
      }}
      onKeyUp={() => {
        if (scrub !== null) seek(scrub);
        setScrub(null);
      }}
      onBlur={() => setScrub(null)}
    />
  );

  if (compact) {
    return (
      <>
        <span className="w-9 shrink-0 text-right text-[0.6875rem] tabular-nums text-[var(--text-mute)]">
          {formatDuration(value)}
        </span>
        {input}
        <span className="w-9 shrink-0 text-[0.6875rem] tabular-nums text-[var(--text-mute)]">
          {max > 0 ? formatDuration(max) : "--:--"}
        </span>
      </>
    );
  }

  return (
    <div>
      {input}
      <div className="mt-1.5 flex justify-between text-[0.6875rem] tabular-nums text-[var(--text-mute)]">
        <span>{formatDuration(value)}</span>
        <span>{max > 0 ? formatDuration(max) : "--:--"}</span>
      </div>
    </div>
  );
}

/* ------------------------------- extras ------------------------------- */

function Extras({ expanded }: { expanded: boolean }) {
  const track = useStore(currentTrack);
  const lyricsEnabled = useStore((s) => s.settings.lyricsEnabled);
  const queueLen = useStore((s) => s.queue.length);
  const error = useStore((s) => s.playbackError);

  if (!track) return null;

  if (!expanded) {
    return (
      <div className="flex shrink-0 items-center gap-0.5 lg:w-[22%] lg:min-w-[150px] lg:justify-end">
        <div className="hidden lg:block">
          <VolumeControl compact />
        </div>
        <IconButton label={`Up next — ${queueLen} in queue`} onClick={() => openSheet({ kind: "queue" })} size={36}>
          <IconQueue size={20} />
        </IconButton>
        <IconButton
          label="Expand player"
          onClick={() => setExpanded(true)}
          size={36}
          className="hidden sm:inline-grid"
        >
          <IconChevronDown size={20} className="rotate-180" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[min(80vw,26rem)] shrink-0 px-4 pt-7 pb-10 sm:px-0 lg:max-w-[34rem]">
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-[var(--r-md)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3.5 py-3"
        >
          <p className="text-[0.8125rem] font-medium text-[var(--text)]">{error.message}</p>
          {error.hint && <p className="mt-1 text-[0.75rem] text-[var(--text-dim)]">{error.hint}</p>}
        </div>
      )}

      <div className="mb-5">
        <VolumeControl />
      </div>

      <div className="flex items-center justify-around border-t border-[var(--border-soft)] pt-4">
        <IconButton
          label="Lyrics"
          onClick={() => openSheet({ kind: "lyrics" })}
          disabled={!lyricsEnabled}
          title={lyricsEnabled ? "Lyrics" : "Lyrics are turned off in Settings"}
        >
          <IconLyrics size={21} />
        </IconButton>
        <IconButton label="Add to playlist" onClick={() => openSheet({ kind: "add-to-playlist", tracks: [track] })}>
          <IconPlaylist size={21} />
        </IconButton>
        <IconButton label={`Up next — ${queueLen} in queue`} onClick={() => openSheet({ kind: "queue" })}>
          <IconQueue size={21} />
        </IconButton>
        <IconButton
          label="Open on YouTube"
          onClick={() => window.open(`https://www.youtube.com/watch?v=${track.videoId}`, "_blank", "noopener,noreferrer")}
        >
          <IconExternal size={21} />
        </IconButton>
      </div>

      <p className="mt-6 text-center text-[0.6875rem] leading-relaxed text-[var(--text-mute)]">
        Playing through the official YouTube player.{" "}
        <a
          href={`https://www.youtube.com/watch?v=${track.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--text-dim)]"
        >
          Watch on YouTube
        </a>
      </p>
    </div>
  );
}

function VolumeControl({ compact }: { compact?: boolean }) {
  const volume = useStore((s) => s.volume);
  const muted = useStore((s) => s.muted);
  const shown = muted ? 0 : volume;
  const level: 0 | 1 | 2 = shown === 0 ? 0 : shown < 55 ? 1 : 2;
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={compact ? "flex items-center gap-1.5" : "flex items-center gap-3"}>
      <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute} size={compact ? 34 : 38}>
        <IconVolume size={compact ? 18 : 20} level={level} />
      </IconButton>
      <input
        ref={ref}
        type="range"
        className={`track-range ${compact ? "w-20" : "flex-1"}`}
        min={0}
        max={100}
        value={shown}
        aria-label="Volume"
        style={{ ["--fill" as string]: `${shown}%` }}
        onChange={(e) => setVolume(Number(e.target.value))}
      />
      {!compact && (
        <span className="w-8 text-right text-[0.6875rem] tabular-nums text-[var(--text-mute)]">
          {shown}
        </span>
      )}
    </div>
  );
}

"use client";

import { memo } from "react";
import { cleanArtist, cleanTitle, formatDuration, spokenDuration } from "@/lib/format";
import { currentTrack, openSheet, useStore, type Sheet } from "@/lib/store";
import type { Track } from "@/lib/types";
import { IconDrag, IconHeart, IconMore, IconPlay } from "@/components/ui/Icons";
import { Artwork, PlayingBars } from "./Artwork";

export type TrackRowProps = {
  track: Track;
  index?: number;
  onPlay: () => void;
  menu: Extract<Sheet, { kind: "track-menu" }>;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  showIndex?: boolean;
  trailing?: React.ReactNode;
  subtitle?: string;
};

function TrackRowBase({
  track,
  index,
  onPlay,
  menu,
  dragHandleProps,
  showIndex,
  trailing,
  subtitle,
}: TrackRowProps) {
  const isCurrent = useStore((s) => currentTrack(s)?.videoId === track.videoId);
  const isPlaying = useStore((s) => s.isPlaying);
  const isFav = useStore((s) => s.favorites.has(track.videoId));

  const title = cleanTitle(track.title);
  const artist = cleanArtist(track.channelTitle);

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-[var(--r-md)] px-2 py-2 transition-colors ${
        isCurrent ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
      }`}
    >
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          className="-ml-1 hidden shrink-0 cursor-grab touch-none place-items-center self-stretch px-1 text-[var(--text-mute)] hover:text-[var(--text)] active:cursor-grabbing sm:grid"
          aria-label="Drag to reorder"
          role="button"
          tabIndex={-1}
        >
          <IconDrag size={18} />
        </span>
      )}

      {showIndex && index !== undefined && (
        <span className="w-5 shrink-0 text-right text-[0.8125rem] tabular-nums text-[var(--text-mute)]">
          {isCurrent ? <PlayingBars paused={!isPlaying} /> : index + 1}
        </span>
      )}

      <button
        type="button"
        onClick={onPlay}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Play ${title} by ${artist}, ${spokenDuration(track.durationSec)}`}
      >
        <span className="relative shrink-0">
          <Artwork track={track} className="h-12 w-12" />
          {isCurrent ? (
            <span className="absolute inset-0 grid place-items-center rounded-[var(--r-sm)] bg-black/55">
              <PlayingBars paused={!isPlaying} />
            </span>
          ) : (
            <span className="absolute inset-0 grid place-items-center rounded-[var(--r-sm)] bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <IconPlay size={18} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[0.875rem] leading-tight font-semibold ${
              isCurrent ? "brand-text" : "text-[var(--text)]"
            }`}
          >
            {title}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[0.75rem] leading-tight text-[var(--text-dim)]">
            {isFav && (
              <span className="shrink-0 text-[var(--accent)]" aria-label="Favorited">
                <IconHeart size={11} filled />
              </span>
            )}
            <span className="truncate">{subtitle ?? artist}</span>
          </span>
        </span>
      </button>

      {trailing}

      <span className="shrink-0 text-[0.75rem] tabular-nums text-[var(--text-mute)]">
        {formatDuration(track.durationSec)}
      </span>

      <button
        type="button"
        onClick={() => openSheet(menu)}
        aria-label={`More options for ${title}`}
        className="-mr-1 shrink-0 rounded-full p-1.5 text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
      >
        <IconMore size={18} />
      </button>
    </div>
  );
}

export const TrackRow = memo(TrackRowBase);

/** Square card used in the horizontally scrolling Home shelves. */
export function TrackCard({
  track,
  onPlay,
  menu,
  caption,
}: {
  track: Track;
  onPlay: () => void;
  menu: Extract<Sheet, { kind: "track-menu" }>;
  caption?: string;
}) {
  const isCurrent = useStore((s) => currentTrack(s)?.videoId === track.videoId);
  const isPlaying = useStore((s) => s.isPlaying);
  const title = cleanTitle(track.title);

  return (
    <div className="group relative w-[9.5rem] shrink-0 sm:w-[11rem]">
      <button
        type="button"
        onClick={onPlay}
        className="block w-full text-left"
        aria-label={`Play ${title} by ${cleanArtist(track.channelTitle)}`}
      >
        <span className="card-hover relative block">
          <Artwork
            track={track}
            size="lg"
            rounded="rounded-[var(--r-md)]"
            className="aspect-square w-full"
          />
          {/* Dark overlay + centred play, fading in on hover. */}
          <span
            className={`absolute inset-0 grid place-items-center rounded-[var(--r-md)] bg-black/45 transition-opacity ${
              isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isCurrent ? (
              <PlayingBars paused={!isPlaying} />
            ) : (
              <span className="brand-gradient grid h-11 w-11 place-items-center rounded-full text-[var(--on-accent)] shadow-[var(--shadow-lg)]">
                <IconPlay size={18} className="ml-0.5" />
              </span>
            )}
          </span>
        </span>
        <span
          className={`mt-2.5 block truncate text-[0.875rem] font-bold ${
            isCurrent ? "brand-text" : "text-[var(--text)]"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--text-dim)]">
          {caption ?? cleanArtist(track.channelTitle)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => openSheet(menu)}
        aria-label={`More options for ${title}`}
        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <IconMore size={16} />
      </button>
    </div>
  );
}

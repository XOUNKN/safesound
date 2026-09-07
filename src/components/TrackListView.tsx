"use client";

import type { ReactNode } from "react";
import { formatTotalDuration, pluralize } from "@/lib/format";
import { playCollection, shuffleCollection, type QueueContext } from "@/lib/store";
import type { Track } from "@/lib/types";
import { TrackRow } from "@/components/track/TrackRow";
import { Button, Chip, ErrorState, TrackRowSkeleton } from "@/components/ui/primitives";
import { IconPlay, IconShuffle } from "@/components/ui/Icons";

export type SortKey = "recent" | "alpha" | "played";

export const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently added" },
  { key: "alpha", label: "Alphabetical" },
  { key: "played", label: "Recently played" },
];

/**
 * Shared body for Favorites / History style pages: header actions, sorting,
 * loading, error and empty states, and the track list itself.
 */
export function TrackListView({
  title,
  tracks,
  context,
  loading,
  error,
  onRetry,
  sort,
  onSort,
  sorts = SORT_LABELS,
  empty,
  origin = "library",
  headerExtra,
  subtitleFor,
}: {
  title: string;
  tracks: Track[];
  context: QueueContext;
  loading: boolean;
  error?: { message: string; hint?: string } | null;
  onRetry?: () => void;
  sort?: SortKey;
  onSort?: (s: SortKey) => void;
  sorts?: { key: SortKey; label: string }[];
  empty: ReactNode;
  origin?: "search" | "queue" | "playlist" | "library";
  headerExtra?: ReactNode;
  subtitleFor?: (t: Track) => string | undefined;
}) {
  const total = tracks.reduce((n, t) => n + t.durationSec, 0);

  return (
    <>
      <div className="px-4 pt-4 lg:px-6 lg:pt-8">
        <h1 className="hidden text-2xl font-semibold tracking-tight lg:block">{title}</h1>

        {!loading && tracks.length > 0 && (
          <>
            <p className="mt-1 text-[0.8125rem] text-[var(--text-dim)]">
              {pluralize(tracks.length, "track")} · {formatTotalDuration(total)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Button variant="primary" onClick={() => playCollection(tracks, 0, context)}>
                <IconPlay size={17} /> Play
              </Button>
              <Button
                variant="secondary"
                disabled={tracks.length < 2}
                onClick={() => shuffleCollection(tracks, context)}
              >
                <IconShuffle size={17} /> Shuffle
              </Button>
              {headerExtra}
            </div>
          </>
        )}

        {sort && onSort && !loading && tracks.length > 1 && (
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {sorts.map((s) => (
              <Chip key={s.key} active={sort === s.key} onClick={() => onSort(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 px-2 lg:px-4">
        {loading ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="px-2">
            <ErrorState title={error.message} hint={error.hint} onRetry={onRetry} />
          </div>
        ) : tracks.length === 0 ? (
          empty
        ) : (
          <div className="space-y-0.5">
            {tracks.map((track, i) => (
              <TrackRow
                key={`${track.videoId}-${i}`}
                track={track}
                index={i}
                showIndex
                subtitle={subtitleFor?.(track)}
                onPlay={() => playCollection(tracks, i, context)}
                menu={{ kind: "track-menu", track, origin }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

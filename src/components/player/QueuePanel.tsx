"use client";

import { useEffect } from "react";
import { cleanArtist, cleanTitle, formatDuration, pluralize } from "@/lib/format";
import {
  clearQueue,
  closeSheet,
  currentItem,
  jumpToQid,
  moveQueueItem,
  openSheet,
  removeFromQueue,
  toggleShuffle,
  useStore,
} from "@/lib/store";
import {
  IconClose,
  IconDrag,
  IconMore,
  IconQueue,
  IconShuffle,
  IconTrash,
} from "@/components/ui/Icons";
import { Button, EmptyState, IconButton } from "@/components/ui/primitives";
import { Artwork, PlayingBars } from "@/components/track/Artwork";
import { useReorder } from "@/components/dnd/useReorder";

/**
 * The Up Next surface. A bottom sheet on phones, a right-hand drawer on
 * desktop — the layout the spec asks for on each form factor.
 */
export default function QueuePanel() {
  const open = useStore((s) => s.sheet?.kind === "queue");
  const queue = useStore((s) => s.queue);
  const currentIndex = useStore((s) => s.currentIndex);
  const context = useStore((s) => s.context);
  const shuffle = useStore((s) => s.shuffle);
  const isPlaying = useStore((s) => s.isPlaying);
  const current = useStore(currentItem);

  const { listProps, itemProps, handleProps } = useReorder((from, to) =>
    // Indices from the visible list are offset past the currently playing row.
    moveQueueItem(from + currentIndex + 1, to + currentIndex + 1),
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  const upNext = queue.slice(currentIndex + 1);
  const upNextDuration = upNext.reduce((n, i) => n + i.track.durationSec, 0);

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <button
        type="button"
        aria-label="Close queue"
        onClick={closeSheet}
        className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        tabIndex={-1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Up next"
        className="animate-sheet relative flex h-full w-full max-w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-w-[26rem]"
      >
        <header className="pt-safe flex shrink-0 items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text)]">Up next</h2>
            <p className="mt-0.5 truncate text-[0.75rem] text-[var(--text-mute)]">
              {context ? `From ${context.name} · ` : ""}
              {upNext.length ? `${pluralize(upNext.length, "track")} · ${formatDuration(upNextDuration)}` : "Nothing queued"}
            </p>
          </div>
          <IconButton label="Close queue" onClick={closeSheet} size={36}>
            <IconClose size={19} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-6">
          {current && (
            <section className="pt-3">
              <h3 className="px-2 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--text-mute)] uppercase">
                Currently playing
              </h3>
              <div className="flex items-center gap-3 rounded-[var(--r-sm)] bg-[var(--surface-2)] px-2 py-2">
                <span className="relative shrink-0">
                  <Artwork track={current.track} className="h-12 w-12" />
                  <span className="absolute inset-0 grid place-items-center rounded-[var(--r-sm)] bg-black/55">
                    <PlayingBars paused={!isPlaying} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-medium text-[var(--accent)]">
                    {cleanTitle(current.track)}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--text-dim)]">
                    {cleanArtist(current.track)}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="More options"
                  onClick={() =>
                    openSheet({ kind: "track-menu", track: current.track, origin: "queue" })
                  }
                  className="shrink-0 rounded-full p-1.5 text-[var(--text-mute)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                >
                  <IconMore size={18} />
                </button>
              </div>
            </section>
          )}

          <section className="pt-5">
            <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
              <h3 className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--text-mute)] uppercase">
                Up next
              </h3>
              {upNext.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleShuffle}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[0.75rem] font-medium transition-colors ${
                      shuffle
                        ? "bg-[var(--surface-2)] text-[var(--accent)]"
                        : "text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    }`}
                  >
                    <IconShuffle size={14} /> Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={clearQueue}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[0.75rem] font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                  >
                    <IconTrash size={14} /> Clear
                  </button>
                </div>
              )}
            </div>

            {upNext.length === 0 ? (
              <EmptyState
                icon={<IconQueue size={24} />}
                title="Nothing up next"
                body="Use the ••• menu on any track to add it to the queue, or play a playlist to fill it."
              />
            ) : (
              <div {...listProps}>
                {upNext.map((item, i) => (
                  <div key={item.qid} {...itemProps(i)}>
                    <div className="group flex items-center gap-2 rounded-[var(--r-sm)] px-2 py-2 transition-colors hover:bg-[var(--surface-2)]">
                      <span
                        {...handleProps(i, upNext.length)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Reorder ${cleanTitle(item.track)}. Use arrow keys to move.`}
                        className="grid shrink-0 cursor-grab touch-none place-items-center rounded-lg p-1 text-[var(--text-mute)] hover:text-[var(--text)] active:cursor-grabbing"
                      >
                        <IconDrag size={17} />
                      </span>

                      <button
                        type="button"
                        onClick={() => jumpToQid(item.qid)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        aria-label={`Play ${cleanTitle(item.track)} now`}
                      >
                        <Artwork track={item.track} className="h-11 w-11 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.875rem] font-medium text-[var(--text)]">
                            {cleanTitle(item.track)}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--text-dim)]">
                            {cleanArtist(item.track)}
                          </span>
                        </span>
                      </button>

                      <span className="shrink-0 text-[0.6875rem] tabular-nums text-[var(--text-mute)]">
                        {formatDuration(item.track.durationSec)}
                      </span>

                      <button
                        type="button"
                        aria-label={`Remove ${cleanTitle(item.track)} from queue`}
                        onClick={() => removeFromQueue(item.qid)}
                        className="shrink-0 rounded-full p-1.5 text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--danger)]"
                      >
                        <IconClose size={16} />
                      </button>

                      <button
                        type="button"
                        aria-label={`More options for ${cleanTitle(item.track)}`}
                        onClick={() =>
                          openSheet({ kind: "track-menu", track: item.track, origin: "queue" })
                        }
                        className="-mr-1 shrink-0 rounded-full p-1.5 text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                      >
                        <IconMore size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="pb-safe shrink-0 border-t border-[var(--border-soft)] px-4 py-3">
          <Button variant="secondary" className="w-full" onClick={closeSheet}>
            Done
          </Button>
        </div>
      </aside>
    </div>
  );
}

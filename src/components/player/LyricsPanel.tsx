"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, describeError, RequestError } from "@/lib/api";
import { cleanArtist, cleanTitle } from "@/lib/format";
import { closeSheet, currentTrack, seek, updateSettings, useStore } from "@/lib/store";
import type { Lyrics } from "@/lib/types";
import { IconClose, IconLyrics } from "@/components/ui/Icons";
import { EmptyState, ErrorState, IconButton, Skeleton, Toggle } from "@/components/ui/primitives";

type Status =
  | { kind: "loading" }
  | { kind: "ok"; lyrics: Lyrics }
  | { kind: "none"; message: string; hint?: string }
  | { kind: "error"; message: string; hint?: string };

export default function LyricsPanel() {
  const open = useStore((s) => s.sheet?.kind === "lyrics");
  const track = useStore(currentTrack);
  const position = useStore((s) => s.positionSec);
  const autoscroll = useStore((s) => s.settings.lyricsAutoscroll);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const userScrolledAt = useRef(0);

  const videoId = track?.videoId;

  useEffect(() => {
    if (!open || !videoId) return;
    const ctrl = new AbortController();
    setStatus({ kind: "loading" });
    api
      .get<{ lyrics: Lyrics }>(`/api/lyrics/${videoId}`, ctrl.signal)
      .then(({ lyrics }) => setStatus({ kind: "ok", lyrics }))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const { message, hint } = describeError(err);
        const notFound = err instanceof RequestError && err.code === "LYRICS_NOT_FOUND";
        setStatus({ kind: notFound ? "none" : "error", message, hint });
      });
    return () => ctrl.abort();
  }, [open, videoId]);

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

  const lyrics = status.kind === "ok" ? status.lyrics : null;

  const activeIndex = useMemo(() => {
    if (!lyrics?.synced) return -1;
    const ms = position * 1000;
    let idx = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      const t = lyrics.lines[i]!.timeMs;
      if (t === null || t > ms) break;
      idx = i;
    }
    return idx;
  }, [lyrics, position]);

  // Follow the song, but stand down for a few seconds after a manual scroll.
  useEffect(() => {
    if (!autoscroll || activeIndex < 0 || !activeRef.current) return;
    if (Date.now() - userScrolledAt.current < 4000) return;
    activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex, autoscroll]);

  if (!open || !track) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-center">
      <button
        type="button"
        aria-label="Close lyrics"
        onClick={closeSheet}
        className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm"
        tabIndex={-1}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Lyrics"
        className="animate-sheet relative flex h-full w-full flex-col bg-[var(--surface)] sm:my-6 sm:h-[min(46rem,92vh)] sm:max-w-lg sm:rounded-[var(--r-lg)] sm:border sm:border-[var(--border)] sm:shadow-[var(--shadow-lg)]"
      >
        <header className="pt-safe flex shrink-0 items-start gap-3 border-b border-[var(--border-soft)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-[var(--text)]">
              {cleanTitle(track)}
            </h2>
            <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--text-dim)]">
              {cleanArtist(track)}
            </p>
          </div>
          <IconButton label="Close lyrics" onClick={closeSheet} size={36}>
            <IconClose size={19} />
          </IconButton>
        </header>

        <div
          ref={scroller}
          onScroll={() => {
            userScrolledAt.current = Date.now();
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8"
        >
          {status.kind === "loading" && (
            <div className="space-y-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-5" style={{ width: `${55 + ((i * 13) % 40)}%` }} />
              ))}
            </div>
          )}

          {status.kind === "none" && (
            <EmptyState
              icon={<IconLyrics size={24} />}
              title="No lyrics for this one"
              body={status.hint ?? status.message}
            />
          )}

          {status.kind === "error" && (
            <ErrorState title={status.message} hint={status.hint} />
          )}

          {lyrics && (
            <>
              {lyrics.lines.map((line, i) => {
                const isActive = i === activeIndex;
                const isPast = activeIndex >= 0 && i < activeIndex;
                const seekable = lyrics.synced && line.timeMs !== null;
                return (
                  <button
                    key={`${i}-${line.timeMs ?? "x"}`}
                    ref={isActive ? activeRef : undefined}
                    type="button"
                    disabled={!seekable}
                    onClick={() => seekable && seek((line.timeMs ?? 0) / 1000)}
                    className={`block w-full py-1.5 text-left text-[1.0625rem] leading-relaxed transition-all duration-300 ${
                      seekable ? "cursor-pointer" : "cursor-default"
                    } ${
                      isActive
                        ? "scale-[1.01] font-semibold text-[var(--text)]"
                        : isPast
                          ? "text-[var(--text-mute)]"
                          : lyrics.synced
                            ? "text-[var(--text-mute)]"
                            : "text-[var(--text-dim)]"
                    }`}
                    style={{ transformOrigin: "left center" }}
                  >
                    {line.text || " "}
                  </button>
                );
              })}

              <div className="mt-10 border-t border-[var(--border-soft)] pt-5">
                <p className="text-[0.75rem] leading-relaxed text-[var(--text-mute)]">
                  Lyrics provided by{" "}
                  <a
                    href={lyrics.providerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-[var(--text-dim)]"
                  >
                    {lyrics.provider}
                  </a>
                  {lyrics.synced ? " · time-synced" : " · unsynced"}
                  {lyrics.artistName ? ` · matched to "${lyrics.trackName}" by ${lyrics.artistName}` : ""}
                </p>
              </div>
            </>
          )}
        </div>

        {lyrics?.synced && (
          <div className="pb-safe flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-soft)] px-5 py-3.5">
            <span className="text-[0.8125rem] text-[var(--text-dim)]">Follow along automatically</span>
            <Toggle
              checked={autoscroll}
              onChange={(v) => updateSettings({ lyricsAutoscroll: v })}
              label="Auto-scroll lyrics"
            />
          </div>
        )}
      </section>
    </div>
  );
}

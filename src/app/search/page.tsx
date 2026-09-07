"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, describeError, RequestError } from "@/lib/api";
import { pluralize } from "@/lib/format";
import { playCollection, useStore } from "@/lib/store";
import type { SearchPage, Track } from "@/lib/types";
import { MobileHeader } from "@/components/nav/Navigation";
import { TrackRow } from "@/components/track/TrackRow";
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  Spinner,
  TrackRowSkeleton,
} from "@/components/ui/primitives";
import { IconClose, IconHistory, IconSearch, IconTrending } from "@/components/ui/Icons";

type Status = "idle" | "loading" | "loaded" | "error";

export default function SearchPage_() {
  const signedIn = useStore((s) => Boolean(s.user));
  const youtubeConfigured = useStore((s) => s.youtubeConfigured);
  const hydrated = useStore((s) => s.hydrated);

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [musicOnly, setMusicOnly] = useState(true);
  const [items, setItems] = useState<Track[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recent, setRecent] = useState<{ query: string; at: number }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const seededFromUrl = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Deep links like /search?q=… prefill the box. Read after mount so there is
  // no server/client markup mismatch and no Suspense boundary needed.
  useEffect(() => {
    if (seededFromUrl.current) return;
    seededFromUrl.current = true;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  /* ---- recent searches ---- */
  const loadRecent = useCallback(async () => {
    if (!signedIn) return setRecent([]);
    try {
      const res = await api.get<{ searches: { query: string; at: number }[] }>(
        "/api/search/history",
      );
      setRecent(res.searches);
    } catch {
      /* recents are a convenience, not worth an error banner */
    }
  }, [signedIn]);

  useEffect(() => {
    if (hydrated) void loadRecent();
  }, [hydrated, loadRecent]);

  /* ---- the search itself ---- */
  const run = useCallback(
    async (q: string, music: boolean) => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;

      setStatus("loading");
      setError(null);
      setItems([]);
      setPageToken(null);
      try {
        const res = await api.get<SearchPage>(
          `/api/search?q=${encodeURIComponent(q)}${music ? "" : "&all=1"}`,
          ctrl.signal,
        );
        setItems(res.items);
        setPageToken(res.nextPageToken);
        setStatus("loaded");
        void loadRecent();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(describeError(err));
        setStatus("error");
      }
    },
    [loadRecent],
  );

  /* ---- debounce: 400ms after the user stops typing ---- */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abort.current?.abort();
      setStatus("idle");
      setItems([]);
      setSubmitted("");
      return;
    }
    // No key on the server: the banner below already explains it, so don't
    // spend a round trip only to render the same message twice.
    if (hydrated && !youtubeConfigured) {
      setSubmitted(q);
      setStatus("idle");
      return;
    }
    const t = setTimeout(() => {
      setSubmitted(q);
      void run(q, musicOnly);
    }, 400);
    return () => clearTimeout(t);
  }, [query, musicOnly, run, hydrated, youtubeConfigured]);

  /* ---- infinite scroll ---- */
  const loadMore = useCallback(async () => {
    if (!pageToken || loadingMore || !submitted) return;
    setLoadingMore(true);
    try {
      const res = await api.get<SearchPage>(
        `/api/search?q=${encodeURIComponent(submitted)}&pageToken=${encodeURIComponent(pageToken)}${
          musicOnly ? "" : "&all=1"
        }`,
      );
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.videoId));
        return [...prev, ...res.items.filter((t) => !seen.has(t.videoId))];
      });
      setPageToken(res.nextPageToken);
    } catch (err) {
      const { message, hint } = describeError(err);
      setError({ message, hint });
      setPageToken(null);
    } finally {
      setLoadingMore(false);
    }
  }, [pageToken, loadingMore, submitted, musicOnly]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !pageToken) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pageToken, loadMore]);

  async function clearHistory(q?: string) {
    try {
      const res = await api.del<{ searches: { query: string; at: number }[] }>(
        `/api/search/history${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setRecent(res.searches);
    } catch (err) {
      setError(describeError(err));
    }
  }

  const showRecents =
    status === "idle" && query.trim().length < 2 && (youtubeConfigured || !hydrated);

  return (
    <>
      <MobileHeader title="Search" />

      <div className="px-4 pt-4 lg:px-6 lg:pt-8">
        <h1 className="mb-4 hidden text-2xl font-semibold tracking-tight lg:block">Search</h1>

        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--text-mute)]">
            <IconSearch size={19} />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            autoFocus
            enterKeyHint="search"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Songs, artists, albums…"
            aria-label="Search YouTube for music"
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] pr-11 pl-12 text-[0.9375rem] text-[var(--text)] placeholder:text-[var(--text-mute)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <span className="absolute top-1/2 right-2 -translate-y-1/2">
              <IconButton
                label="Clear search"
                size={34}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <IconClose size={17} />
              </IconButton>
            </span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Chip active={musicOnly} onClick={() => setMusicOnly(true)}>
            Music
          </Chip>
          <Chip active={!musicOnly} onClick={() => setMusicOnly(false)}>
            All videos
          </Chip>
          {status === "loaded" && items.length > 0 && (
            <span className="ml-auto self-center text-[0.75rem] text-[var(--text-mute)]">
              {pluralize(items.length, "result")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 px-2 lg:px-4">
        {!youtubeConfigured && hydrated && (
          <div className="px-2 pb-4">
            <ErrorState
              title="Search isn't configured on this server"
              body="An operator needs to add a YouTube Data API v3 key before search and trending work."
              hint="Set YOUTUBE_API_KEY in .env.local and restart. Your saved music is unaffected."
            />
          </div>
        )}

        {showRecents && (
          <RecentSearches
            recent={recent}
            signedIn={signedIn}
            onPick={(q) => {
              setQuery(q);
              inputRef.current?.focus();
            }}
            onRemove={(q) => void clearHistory(q)}
            onClearAll={() => void clearHistory()}
          />
        )}

        {status === "loading" && (
          <div className="space-y-1 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && error && (
          <div className="px-2">
            <ErrorState
              title={error.message}
              hint={error.hint}
              onRetry={() => void run(submitted || query.trim(), musicOnly)}
            />
          </div>
        )}

        {status === "loaded" && items.length === 0 && (
          <EmptyState
            icon={<IconSearch size={26} />}
            title={`Nothing found for "${submitted}"`}
            body={
              musicOnly
                ? "Try a different spelling, or switch to All videos — the Music filter only searches YouTube's music category."
                : "Try a different spelling or a shorter search."
            }
            action={
              musicOnly ? (
                <Button variant="secondary" onClick={() => setMusicOnly(false)}>
                  Search all videos
                </Button>
              ) : undefined
            }
          />
        )}

        {items.length > 0 && (
          <>
            <div className="space-y-0.5">
              {items.map((track, i) => (
                <TrackRow
                  key={track.videoId}
                  track={track}
                  index={i}
                  onPlay={() =>
                    playCollection(items, i, {
                      type: "search",
                      id: null,
                      name: `Search: ${submitted}`,
                    })
                  }
                  menu={{ kind: "track-menu", track, origin: "search" }}
                />
              ))}
            </div>

            <div ref={sentinel} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-6 text-[var(--text-mute)]">
                <Spinner />
              </div>
            )}
            {!pageToken && !loadingMore && (
              <p className="py-8 text-center text-[0.8125rem] text-[var(--text-mute)]">
                That&rsquo;s everything YouTube returned for this search.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* --------------------------- recent searches --------------------------- */

function RecentSearches({
  recent,
  signedIn,
  onPick,
  onRemove,
  onClearAll,
}: {
  recent: { query: string; at: number }[];
  signedIn: boolean;
  onPick: (q: string) => void;
  onRemove: (q: string) => void;
  onClearAll: () => void;
}) {
  if (!signedIn) {
    return (
      <EmptyState
        icon={<IconTrending size={26} />}
        title="Search YouTube for anything"
        body="Type at least two characters. Sign in and your recent searches are saved here for next time."
      />
    );
  }

  if (!recent.length) {
    return (
      <EmptyState
        icon={<IconSearch size={26} />}
        title="What do you want to hear?"
        body="Search by song, artist or album. Your recent searches will show up here."
      />
    );
  }

  return (
    <section className="px-2 pb-4">
      <div className="mb-1 flex items-center justify-between px-2">
        <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--text-dim)]">
          <IconHistory size={16} /> Recent searches
        </h2>
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-lg px-2 py-1 text-[0.75rem] font-medium text-[var(--text-mute)] transition-colors hover:text-[var(--danger)]"
        >
          Clear all
        </button>
      </div>
      <ul>
        {recent.map((r) => (
          <li key={r.query} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPick(r.query)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="shrink-0 text-[var(--text-mute)]">
                <IconHistory size={17} />
              </span>
              <span className="truncate text-[0.875rem] text-[var(--text)]">{r.query}</span>
            </button>
            <button
              type="button"
              aria-label={`Remove "${r.query}" from recent searches`}
              onClick={() => onRemove(r.query)}
              className="shrink-0 rounded-full p-2 text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
            >
              <IconClose size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

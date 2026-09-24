"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, describeError } from "@/lib/api";
import { cleanArtist, cleanTitle, pluralize, relativeTime } from "@/lib/format";
import {
  playCollection,
  setExpanded,
  currentTrack,
  useStore,
} from "@/lib/store";
import type { ApiErrorCode, Playlist, Track } from "@/lib/types";
import { Shelf } from "@/components/Shelf";
import { PlaylistCard } from "@/components/PlaylistCard";
import { Artwork, PlayingBars } from "@/components/track/Artwork";
import { TrackCard } from "@/components/track/TrackRow";
import { Button, ErrorState, EmptyState, Skeleton } from "@/components/ui/primitives";
import { IconPlay, IconSearch, IconSparkle } from "@/components/ui/Icons";

type ShelfResult<T> = { items: T[] } | { error: { code: ApiErrorCode; message: string; hint?: string } };

type HomeData = {
  signedIn: boolean;
  youtubeConfigured: boolean;
  recentlyPlayed?: (Track & { playedAt: number })[];
  favorites?: Track[];
  playlists?: Playlist[];
  trending: ShelfResult<Track>;
  discover?: ShelfResult<Track>;
  discoverBasis?: string[];
};

const itemsOf = <T,>(r: ShelfResult<T> | undefined): T[] =>
  r && "items" in r ? r.items : [];
const errorOf = <T,>(r: ShelfResult<T> | undefined) => (r && "error" in r ? r.error : null);

export default function HomePage() {
  const revision = useStore((s) => s.revision);
  const userId = useStore((s) => s.user?.id ?? null);
  const hydrated = useStore((s) => s.hydrated);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<HomeData>("/api/home"));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, userId, revision, load]);

  const recent = data?.recentlyPlayed ?? [];
  const favorites = data?.favorites ?? [];
  const playlists = data?.playlists ?? [];
  const trending = itemsOf(data?.trending);
  const discover = itemsOf(data?.discover);

  return (
    <>
      <div className="animate-rise">
        <Hero trending={trending} />
        <MoodChips />

        {error && (
          <div className="px-4 pt-4 lg:px-6">
            <ErrorState title={error.message} hint={error.hint} onRetry={() => void load()} />
          </div>
        )}

        {data && !data.youtubeConfigured && <NoApiKeyNotice />}

        <NowPlayingCard />

        {loading && !data ? (
          <>
            <Shelf title="Recently played" loading />
            <Shelf title="Trending in music" loading />
          </>
        ) : (
          <>
            {recent.length > 0 && (
              <Shelf title="Jump back in" subtitle="Picking up where you left off" href="/history">
                {recent.map((t) => (
                  <div key={t.videoId} className="snap-start">
                    <TrackCard
                      track={t}
                      caption={relativeTime(t.playedAt)}
                      onPlay={() =>
                        playCollection(recent, recent.indexOf(t), {
                          type: "history",
                          id: null,
                          name: "Recently played",
                        })
                      }
                      menu={{ kind: "track-menu", track: t, origin: "library" }}
                    />
                  </div>
                ))}
              </Shelf>
            )}

            {playlists.length > 0 && (
              <Shelf title="Your playlists" href="/playlists">
                {playlists.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} />
                ))}
              </Shelf>
            )}

            {favorites.length > 0 && (
              <Shelf title="Favorites" subtitle={pluralize(favorites.length, "saved track")} href="/favorites">
                {favorites.map((t) => (
                  <div key={t.videoId} className="snap-start">
                    <TrackCard
                      track={t}
                      onPlay={() =>
                        playCollection(favorites, favorites.indexOf(t), {
                          type: "favorites",
                          id: null,
                          name: "Favorites",
                        })
                      }
                      menu={{ kind: "track-menu", track: t, origin: "library" }}
                    />
                  </div>
                ))}
              </Shelf>
            )}

            {discover.length > 0 && (
              <Shelf
                title="More like what you play"
                // Only claimed when there is real listening history behind it.
                subtitle={
                  data?.discoverBasis?.length
                    ? `Because you listen to ${data.discoverBasis.slice(0, 2).join(" and ")}`
                    : undefined
                }
              >
                {discover.map((t) => (
                  <div key={t.videoId} className="snap-start">
                    <TrackCard
                      track={t}
                      onPlay={() =>
                        playCollection(discover, discover.indexOf(t), {
                          type: "discover",
                          id: null,
                          name: "More like what you play",
                        })
                      }
                      menu={{ kind: "track-menu", track: t, origin: "search" }}
                    />
                  </div>
                ))}
              </Shelf>
            )}

            {trending.length > 0 && (
              <Shelf title="Trending in music" subtitle="YouTube's most popular music right now">
                {trending.map((t) => (
                  <div key={t.videoId} className="snap-start">
                    <TrackCard
                      track={t}
                      onPlay={() =>
                        playCollection(trending, trending.indexOf(t), {
                          type: "trending",
                          id: null,
                          name: "Trending in music",
                        })
                      }
                      menu={{ kind: "track-menu", track: t, origin: "search" }}
                    />
                  </div>
                ))}
              </Shelf>
            )}

            <ShelfError result={data?.trending} label="Trending" onRetry={load} />
            <ShelfError result={data?.discover} label="Recommendations" onRetry={load} />

            {data &&
              data.signedIn &&
              !recent.length &&
              !playlists.length &&
              !favorites.length &&
              !trending.length && (
                <EmptyState
                  icon={<IconSearch size={26} />}
                  title="Your library is empty — for now"
                  body="Search for a song you love. Everything you play, favorite or add to a playlist shows up here."
                  action={
                    <Link href="/search">
                      <Button variant="primary">Find something to play</Button>
                    </Link>
                  }
                />
              )}
          </>
        )}

        <Attribution />
      </div>
    </>
  );
}

/* -------------------------------- hero -------------------------------- */

/** Each mood is just a search, so it costs no API quota until someone taps it. */
const MOODS = [
  { label: "Late night", q: "late night r&b" },
  { label: "Focus", q: "lofi beats to focus" },
  { label: "Workout", q: "workout hip hop mix" },
  { label: "Feel-good", q: "feel good pop hits" },
  { label: "Rainy day", q: "rainy day acoustic songs" },
  { label: "Throwbacks", q: "2000s throwback hits" },
  { label: "Latin heat", q: "reggaeton hits" },
];

function MoodChips() {
  return (
    <nav aria-label="Start with a mood" className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-4 lg:px-6">
      {MOODS.map((m) => (
        <Link
          key={m.label}
          href={`/search?q=${encodeURIComponent(m.q)}`}
          className="shrink-0 rounded-[var(--r-full)] bg-[var(--surface-2)] px-4 py-2 text-[0.8125rem] font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}

function Hero({ trending }: { trending: Track[] }) {
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const router = useRouter();

  // One tap to music: start the chart and open the full player, so the first
  // thing a visitor sees is the product rather than a description of it.
  function startListening() {
    if (!trending.length) {
      router.push("/search");
      return;
    }
    playCollection(trending, 0, { type: "trending", id: null, name: "Trending in music" });
    setExpanded(true);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!hydrated) {
    return (
      <div className="px-4 pt-5 lg:px-6 lg:pt-8">
        <Skeleton className="h-8 w-52" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 pt-4 lg:px-6 lg:pt-8">
        <div className="relative overflow-hidden rounded-[var(--r-lg)] bg-[var(--surface)] px-5 py-6 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(70% 90% at 90% 0%, color-mix(in oklab, var(--accent-to) 30%, transparent), transparent 65%)",
            }}
          />
          <div className="relative">
            <h1 className="max-w-2xl text-[1.75rem] leading-[1.1] font-bold tracking-tight sm:text-5xl">
              Every song on YouTube.{" "}
              <span className="brand-text sm:block">A player built for listening.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--text-dim)] sm:text-[0.9375rem]">
              Synced lyrics, a real queue and playlists that stay yours. Nothing to install, and no
              account needed to press play.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button variant="primary" size="lg" onClick={startListening}>
                <IconPlay size={18} className="-ml-1 mr-2" />
                Start listening
              </Button>
              <Link href="/signup">
                <Button variant="secondary" size="lg">
                  Create a free account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 lg:px-6 lg:pt-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
        {greeting}, {user.displayName.split(" ")[0]}
      </h1>
    </div>
  );
}

/* ------------------------- currently playing card ---------------------- */

function NowPlayingCard() {
  const track = useStore(currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const context = useStore((s) => s.context);
  if (!track) return null;

  return (
    <section className="mt-6 px-4 lg:px-6">
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-4 rounded-[var(--r-md)] bg-[var(--surface-2)] p-3 text-left transition-colors hover:bg-[var(--surface-3)]"
      >
        <span className="relative shrink-0">
          <Artwork track={track} size="lg" className="h-16 w-16" rounded="rounded-xl" />
          <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/45">
            <PlayingBars paused={!isPlaying} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow" style={{ color: "var(--accent-from)" }}>
            {isPlaying ? "Now playing" : "Paused"}
          </span>
          <span className="mt-1 block truncate text-[0.9375rem] font-medium text-[var(--text)]">
            {cleanTitle(track)}
          </span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-[var(--text-dim)]">
            {cleanArtist(track)}
            {context ? ` · from ${context.name}` : ""}
          </span>
        </span>
      </button>
    </section>
  );
}

/* ------------------------------- notices ------------------------------- */

function ShelfError({
  result,
  label,
  onRetry,
}: {
  result: ShelfResult<Track> | undefined;
  label: string;
  onRetry: () => void;
}) {
  const err = errorOf(result);
  if (!err) return null;
  return (
    <div className="mt-8 px-4 lg:px-6">
      <ErrorState
        compact
        title={`${label} couldn't load`}
        body={err.message}
        hint={err.hint}
        onRetry={onRetry}
      />
    </div>
  );
}

function NoApiKeyNotice() {
  return (
    <div className="mt-6 px-4 lg:px-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex gap-3">
          <span className="mt-0.5 shrink-0 text-[var(--accent)]">
            <IconSparkle size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">
              Search isn&rsquo;t switched on yet
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-dim)]">
              This server has no YouTube Data API key, so searching and trending are unavailable.
              Everything already in your library still plays normally.
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--text-mute)]">
              Add <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">YOUTUBE_API_KEY</code> to{" "}
              <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">.env.local</code> and
              restart the server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Attribution() {
  return (
    <footer className="mt-12 border-t border-[var(--border-soft)] px-4 py-6 lg:px-6">
      <p className="text-[0.75rem] leading-relaxed text-[var(--text-mute)]">
        Resonate is an independent player. All music is searched and played through YouTube&rsquo;s
        official APIs and embedded player — nothing is downloaded or re-hosted.{" "}
        <Link href="/legal" className="underline underline-offset-2 hover:text-[var(--text-dim)]">
          Attribution &amp; legal
        </Link>
      </p>
    </footer>
  );
}

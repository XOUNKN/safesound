"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { IconSearch, IconSparkle } from "@/components/ui/Icons";

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
        <Hero />

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

function Hero() {
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);

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
      <div className="px-4 pt-6 lg:px-6 lg:pt-10">
        <div className="relative overflow-hidden rounded-[var(--r-lg)] bg-[var(--surface)] p-6 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(70% 90% at 90% 0%, color-mix(in oklab, var(--accent-to) 30%, transparent), transparent 65%)",
            }}
          />
          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your music, <span className="brand-text">your way</span>
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-dim)]">
              Search YouTube, build playlists that stay yours, and listen in a player designed for
              music instead of video. Free, and no ads added by us.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Create a free account
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="secondary" size="lg">
                  Just start searching
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-[0.75rem] text-[var(--text-mute)]">
              You can search and play without an account. Sign in to keep playlists, favorites and
              history across devices.
            </p>
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
            {cleanTitle(track.title)}
          </span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-[var(--text-dim)]">
            {cleanArtist(track.channelTitle)}
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

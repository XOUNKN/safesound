"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import { cleanArtist, formatTotalDuration, pluralize, relativeTime } from "@/lib/format";
import { loadPlaylists, playCollection, shuffleCollection, useStore } from "@/lib/store";
import type { Playlist, Track } from "@/lib/types";
import { MobileHeader } from "@/components/nav/Navigation";
import SignedOutNotice from "@/components/SignedOutNotice";
import { PlaylistCard } from "@/components/PlaylistCard";
import { TrackRow } from "@/components/track/TrackRow";
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Skeleton,
  TrackRowSkeleton,
} from "@/components/ui/primitives";
import {
  IconHeart,
  IconHistory,
  IconPlaylist,
  IconPlay,
  IconSearch,
  IconShuffle,
} from "@/components/ui/Icons";

type Tab = "favorites" | "playlists" | "recent" | "searches";
type SortKey = "recent" | "alpha" | "played";

const TABS: { key: Tab; label: string }[] = [
  { key: "favorites", label: "Favorites" },
  { key: "playlists", label: "Playlists" },
  { key: "recent", label: "Recently played" },
  { key: "searches", label: "Searches" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently added" },
  { key: "alpha", label: "Alphabetical" },
  { key: "played", label: "Recently played" },
];

type Entry = Track & { playedAt: number };

export default function LibraryPage() {
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const revision = useStore((s) => s.revision);
  const playlists = useStore((s) => s.playlists);
  const playlistsLoaded = useStore((s) => s.playlistsLoaded);

  const [tab, setTab] = useState<Tab>("favorites");
  const [sort, setSort] = useState<SortKey>("recent");
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);
  const [searches, setSearches] = useState<{ query: string; at: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "favorites") {
        const res = await api.get<{ tracks: Track[] }>(`/api/favorites?sort=${sort}`);
        setFavorites(res.tracks);
      } else if (tab === "recent") {
        const res = await api.get<{ tracks: Entry[] }>("/api/history");
        setRecent(res.tracks);
      } else if (tab === "searches") {
        const res = await api.get<{ searches: { query: string; at: number }[] }>(
          "/api/search/history",
        );
        setSearches(res.searches);
      } else {
        await loadPlaylists(sort === "alpha" ? "alpha" : "recent");
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [tab, sort]);

  useEffect(() => {
    if (hydrated && user) void load();
    else if (hydrated) setLoading(false);
  }, [hydrated, user, revision, load]);

  if (hydrated && !user) {
    return (
      <>
        <MobileHeader title="Library" />
        <SignedOutNotice
          title="Your library lives in your account"
          body="Sign in to keep favorites, playlists, listening history and recent searches together."
        />
      </>
    );
  }

  const showSort = tab === "favorites" || tab === "playlists";

  return (
    <>
      <MobileHeader title="Library" />

      <div className="px-4 pt-4 lg:px-6 lg:pt-8">
        <h1 className="hidden text-2xl font-semibold tracking-tight lg:block">Library</h1>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>

        {showSort && (
          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-[0.75rem] text-[var(--text-mute)]">Sort</span>
            {SORTS.filter((s) => tab !== "playlists" || s.key !== "played").map((s) => (
              <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 px-2 lg:px-4">
        {error ? (
          <div className="px-2">
            <ErrorState title={error.message} hint={error.hint} onRetry={load} />
          </div>
        ) : tab === "favorites" ? (
          <FavoritesTab loading={loading} tracks={favorites} />
        ) : tab === "playlists" ? (
          <PlaylistsTab loading={loading && !playlistsLoaded} playlists={playlists} />
        ) : tab === "recent" ? (
          <RecentTab loading={loading} tracks={recent} />
        ) : (
          <SearchesTab loading={loading} searches={searches} />
        )}
      </div>
    </>
  );
}

/* -------------------------------- tabs -------------------------------- */

function ListActions({ tracks, name }: { tracks: Track[]; name: string }) {
  if (tracks.length === 0) return null;
  const total = tracks.reduce((n, t) => n + t.durationSec, 0);
  const context = { type: name.toLowerCase(), id: null, name };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5 px-2">
      <Button variant="primary" size="sm" onClick={() => playCollection(tracks, 0, context)}>
        <IconPlay size={15} /> Play all
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={tracks.length < 2}
        onClick={() => shuffleCollection(tracks, context)}
      >
        <IconShuffle size={15} /> Shuffle
      </Button>
      <span className="text-[0.75rem] text-[var(--text-mute)]">
        {pluralize(tracks.length, "track")} · {formatTotalDuration(total)}
      </span>
    </div>
  );
}

function FavoritesTab({ loading, tracks }: { loading: boolean; tracks: Track[] }) {
  if (loading) return <SkeletonRows />;
  if (!tracks.length) {
    return (
      <EmptyState
        icon={<IconHeart size={26} />}
        title="No favorites yet"
        body="Heart a track anywhere in the app and it shows up here."
        action={
          <Link href="/search">
            <Button variant="primary">Find something to love</Button>
          </Link>
        }
      />
    );
  }
  return (
    <>
      <ListActions tracks={tracks} name="Favorites" />
      <div className="space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.videoId}
            track={track}
            index={i}
            showIndex
            onPlay={() =>
              playCollection(tracks, i, { type: "favorites", id: null, name: "Favorites" })
            }
            menu={{ kind: "track-menu", track, origin: "library" }}
          />
        ))}
      </div>
    </>
  );
}

function RecentTab({ loading, tracks }: { loading: boolean; tracks: Entry[] }) {
  if (loading) return <SkeletonRows />;
  if (!tracks.length) {
    return (
      <EmptyState
        icon={<IconHistory size={26} />}
        title="Nothing played yet"
        body="Your listening history appears here once you press play."
        action={
          <Link href="/search">
            <Button variant="primary">Start listening</Button>
          </Link>
        }
      />
    );
  }
  return (
    <>
      <ListActions tracks={tracks} name="Recently played" />
      <div className="space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow
            key={`${track.videoId}-${track.playedAt}`}
            track={track}
            index={i}
            showIndex
            subtitle={`${cleanArtist(track.channelTitle)} · ${relativeTime(track.playedAt)}`}
            onPlay={() =>
              playCollection(tracks, i, { type: "history", id: null, name: "Recently played" })
            }
            menu={{ kind: "track-menu", track, origin: "library" }}
          />
        ))}
      </div>
      <div className="px-2 pt-6">
        <Link href="/history">
          <Button variant="secondary" size="sm">
            Manage history
          </Button>
        </Link>
      </div>
    </>
  );
}

function PlaylistsTab({
  loading,
  playlists,
}: {
  loading: boolean;
  playlists: Playlist[];
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    );
  }
  if (!playlists.length) {
    return (
      <EmptyState
        icon={<IconPlaylist size={26} />}
        title="No playlists yet"
        body="Group the tracks you love into playlists you can play in one tap."
        action={
          <Link href="/playlists">
            <Button variant="primary">Go to playlists</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div className="no-scrollbar flex flex-wrap gap-x-4 gap-y-6 px-2">
      {playlists.map((p) => (
        <PlaylistCard key={p.id} playlist={p} />
      ))}
    </div>
  );
}

function SearchesTab({
  loading,
  searches,
}: {
  loading: boolean;
  searches: { query: string; at: number }[];
}) {
  if (loading) return <SkeletonRows />;
  if (!searches.length) {
    return (
      <EmptyState
        icon={<IconSearch size={26} />}
        title="No recent searches"
        body="Searches you run are kept here so you can jump back to them. You can turn this off in Settings → Privacy."
      />
    );
  }
  return (
    <ul className="px-2">
      {searches.map((s) => (
        <li key={s.query}>
          <Link
            href={`/search?q=${encodeURIComponent(s.query)}`}
            className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="shrink-0 text-[var(--text-mute)]">
              <IconSearch size={17} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.875rem] text-[var(--text)]">
              {s.query}
            </span>
            <span className="shrink-0 text-[0.75rem] text-[var(--text-mute)]">
              {relativeTime(s.at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <TrackRowSkeleton key={i} />
      ))}
    </div>
  );
}

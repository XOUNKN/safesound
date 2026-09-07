"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTotalDuration, pluralize, relativeTime } from "@/lib/format";
import { loadPlaylists, openSheet, useStore } from "@/lib/store";
import type { Playlist } from "@/lib/types";
import { MobileHeader } from "@/components/nav/Navigation";
import { CoverCollage } from "@/components/track/Artwork";
import { Button, Chip, EmptyState, Skeleton } from "@/components/ui/primitives";
import { IconPlaylist, IconPlus } from "@/components/ui/Icons";
import SignedOutNotice from "@/components/SignedOutNotice";

type Sort = "recent" | "alpha" | "created" | "size";

const SORTS: { key: Sort; label: string }[] = [
  { key: "recent", label: "Recently updated" },
  { key: "alpha", label: "A–Z" },
  { key: "created", label: "Recently added" },
  { key: "size", label: "Most tracks" },
];

export default function PlaylistsPage() {
  const playlists = useStore((s) => s.playlists);
  const loaded = useStore((s) => s.playlistsLoaded);
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const revision = useStore((s) => s.revision);
  const [sort, setSort] = useState<Sort>("recent");

  useEffect(() => {
    if (user) void loadPlaylists(sort);
  }, [user, sort, revision]);

  if (hydrated && !user) {
    return (
      <>
        <MobileHeader title="Playlists" />
        <SignedOutNotice
          title="Playlists live in your account"
          body="Sign in to create playlists, reorder them, and keep them on every device you use."
        />
      </>
    );
  }

  return (
    <>
      <MobileHeader
        title="Playlists"
        action={
          <button
            type="button"
            aria-label="New playlist"
            onClick={() => openSheet({ kind: "create-playlist" })}
            className="rounded-full p-2 text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <IconPlus size={20} />
          </button>
        }
      />

      <div className="px-4 pt-4 lg:px-6 lg:pt-8">
        <div className="hidden items-center justify-between lg:flex">
          <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>
          <Button variant="primary" onClick={() => openSheet({ kind: "create-playlist" })}>
            <IconPlus size={17} /> New playlist
          </Button>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {SORTS.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 lg:px-6">
        {!loaded ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2.5">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <EmptyState
            icon={<IconPlaylist size={26} />}
            title="No playlists yet"
            body="Playlists are how you keep the good stuff together. Make one, then add tracks from search or the ••• menu anywhere in the app."
            action={
              <Button variant="primary" onClick={() => openSheet({ kind: "create-playlist" })}>
                Create your first playlist
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {playlists.map((p) => (
              <li key={p.id}>
                <PlaylistTile playlist={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Link href={`/playlists/${playlist.id}`} className="group block">
      <CoverCollage
        covers={playlist.covers}
        className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <p className="mt-2.5 truncate text-[0.875rem] font-medium text-[var(--text)]">{playlist.name}</p>
      <p className="mt-0.5 truncate text-[0.75rem] text-[var(--text-mute)]">
        {pluralize(playlist.trackCount, "track")}
        {playlist.trackCount > 0 && ` · ${formatTotalDuration(playlist.durationSec)}`}
      </p>
      <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--text-mute)]">
        Updated {relativeTime(playlist.updatedAt)}
        {playlist.visibility === "unlisted" && " · shared by link"}
      </p>
    </Link>
  );
}

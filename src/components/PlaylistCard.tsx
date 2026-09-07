"use client";

import Link from "next/link";
import { pluralize } from "@/lib/format";
import type { Playlist } from "@/lib/types";
import { CoverCollage } from "@/components/track/Artwork";

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className="group w-[9.5rem] shrink-0 sm:w-[11rem]"
    >
      <CoverCollage
        covers={playlist.covers}
        className="card-hover aspect-square w-full"
      />
      <span className="mt-2.5 block truncate text-[0.875rem] font-bold text-[var(--text)]">
        {playlist.name}
      </span>
      <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--text-dim)]">
        {pluralize(playlist.trackCount, "track")}
      </span>
    </Link>
  );
}

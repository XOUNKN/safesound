"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Track } from "@/lib/types";
import { MobileHeader } from "@/components/nav/Navigation";
import SignedOutNotice from "@/components/SignedOutNotice";
import { TrackListView, type SortKey } from "@/components/TrackListView";
import { Button, EmptyState } from "@/components/ui/primitives";
import { IconHeart } from "@/components/ui/Icons";

export default function FavoritesPage() {
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const revision = useStore((s) => s.revision);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sort, setSort] = useState<SortKey>("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ tracks: Track[] }>(`/api/favorites?sort=${sort}`);
      setTracks(res.tracks);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    if (hydrated && user) void load();
    else if (hydrated) setLoading(false);
  }, [hydrated, user, revision, load]);

  if (hydrated && !user) {
    return (
      <>
        <MobileHeader title="Favorites" />
        <SignedOutNotice
          title="Favorites need an account"
          body="Sign in and every track you heart is saved here, on every device."
        />
      </>
    );
  }

  return (
    <>
      <MobileHeader title="Favorites" />
      <TrackListView
        title="Favorites"
        tracks={tracks}
        loading={loading}
        error={error}
        onRetry={load}
        sort={sort}
        onSort={setSort}
        context={{ type: "favorites", id: null, name: "Favorites" }}
        empty={
          <EmptyState
            icon={<IconHeart size={26} />}
            title="No favorites yet"
            body="Tap the heart on any track — in search, in the player, or from the ••• menu — and it lands here."
            action={
              <Link href="/search">
                <Button variant="primary">Find something to love</Button>
              </Link>
            }
          />
        }
      />
    </>
  );
}

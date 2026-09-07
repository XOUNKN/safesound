"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import { formatTotalDuration, pluralize } from "@/lib/format";
import { openSheet, playCollection, shuffleCollection, useStore } from "@/lib/store";
import type { PlaylistDetail } from "@/lib/types";
import { LogoMark } from "@/components/brand/Logo";
import { CoverCollage } from "@/components/track/Artwork";
import { TrackRow } from "@/components/track/TrackRow";
import { Button, ErrorState, Skeleton, TrackRowSkeleton } from "@/components/ui/primitives";
import { IconPlay, IconPlaylist, IconPlus, IconShuffle } from "@/components/ui/Icons";

type Shared = PlaylistDetail & { ownerName: string };

export default function SharedPlaylistPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const signedIn = useStore((s) => Boolean(s.user));

  const [playlist, setPlaylist] = useState<Shared | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus("loading");
    try {
      const res = await api.get<{ playlist: Shared }>(`/api/shared/${token}`);
      setPlaylist(res.playlist);
      setStatus("ready");
    } catch (err) {
      setError(describeError(err));
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-lg font-semibold tracking-tight">Resonate</span>
        </Link>
        <ErrorState
          title={error?.message ?? "This shared playlist isn't available."}
          hint="The link may have expired, or the owner made the playlist private again."
          onRetry={load}
        />
        <div className="mt-5">
          <Link href="/">
            <Button variant="primary">Go to Resonate</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tracks = playlist?.tracks ?? [];
  const total = tracks.reduce((n, t) => n + t.durationSec, 0);
  const context = playlist
    ? { type: "shared", id: playlist.id, name: playlist.name }
    : null;

  return (
    <>
      <header className="pt-safe border-b border-[var(--border-soft)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 lg:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-base font-semibold tracking-tight">Resonate</span>
          </Link>
          {!signedIn && (
            <Link href="/signup">
              <Button size="sm" variant="secondary">
                Create an account
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="px-4 pt-6 lg:px-6 lg:pt-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
          {status === "loading" ? (
            <Skeleton className="aspect-square w-40 rounded-2xl sm:w-52" />
          ) : (
            <CoverCollage
              covers={playlist?.covers ?? []}
              className="aspect-square w-40 shrink-0 shadow-[var(--shadow-lg)] sm:w-52"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--text-mute)] uppercase">
              Shared playlist
            </p>
            {playlist ? (
              <h1 className="mt-1.5 text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
                {playlist.name}
              </h1>
            ) : (
              <Skeleton className="mt-2 h-8 w-48" />
            )}
            <p className="mt-2 text-[0.8125rem] text-[var(--text-dim)]">
              {playlist ? `By ${playlist.ownerName} · ` : ""}
              {pluralize(tracks.length, "track")}
              {total > 0 && ` · ${formatTotalDuration(total)}`}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="lg"
                disabled={!tracks.length}
                onClick={() => context && playCollection(tracks, 0, context)}
              >
                <IconPlay size={18} /> Play
              </Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={tracks.length < 2}
                onClick={() => context && shuffleCollection(tracks, context)}
              >
                <IconShuffle size={18} /> Shuffle
              </Button>
              {signedIn && tracks.length > 0 && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => openSheet({ kind: "add-to-playlist", tracks })}
                >
                  <IconPlus size={18} /> Save a copy
                </Button>
              )}
            </div>

            {!signedIn && (
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--text-mute)]">
                You can play this without an account.{" "}
                <Link href="/signup" className="text-[var(--accent)] underline underline-offset-2">
                  Sign up
                </Link>{" "}
                to keep a copy in your own library.
              </p>
            )}
          </div>
        </header>
      </div>

      <div className="mt-7 px-2 lg:px-4">
        {status === "loading" ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="px-2">
            <ErrorState
              compact
              title="This playlist is empty"
              body="There's nothing in it to play yet."
            />
          </div>
        ) : (
          <div className="space-y-0.5">
            {tracks.map((track, i) => (
              <TrackRow
                key={track.entryId}
                track={track}
                index={i}
                showIndex
                onPlay={() => context && playCollection(tracks, i, context)}
                menu={{ kind: "track-menu", track, origin: "search" }}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-[var(--border-soft)] px-4 py-6 lg:px-6">
        <p className="flex items-center gap-2 text-[0.75rem] text-[var(--text-mute)]">
          <IconPlaylist size={15} />
          Shared read-only. The owner can revoke this link at any time.
        </p>
      </footer>
    </>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import { cleanArtist, relativeTime } from "@/lib/format";
import { bumpRevision, toast, useStore } from "@/lib/store";
import type { Track } from "@/lib/types";
import { MobileHeader } from "@/components/nav/Navigation";
import SignedOutNotice from "@/components/SignedOutNotice";
import { TrackListView } from "@/components/TrackListView";
import { Button, EmptyState } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { IconHistory, IconTrash } from "@/components/ui/Icons";

type Entry = Track & { playedAt: number };

export default function HistoryPage() {
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const revision = useStore((s) => s.revision);
  const saveHistory = useStore((s) => s.settings.saveHistory);
  const [tracks, setTracks] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ tracks: Entry[] }>("/api/history");
      setTracks(res.tracks);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && user) void load();
    else if (hydrated) setLoading(false);
  }, [hydrated, user, revision, load]);

  async function clearAll() {
    try {
      await api.del("/api/history");
      setTracks([]);
      setConfirm(false);
      bumpRevision();
      toast("Listening history cleared", { tone: "success" });
    } catch (err) {
      const { message, hint } = describeError(err);
      toast(message, { tone: "error", hint });
    }
  }

  if (hydrated && !user) {
    return (
      <>
        <MobileHeader title="History" />
        <SignedOutNotice
          title="History needs an account"
          body="Sign in and Resonate remembers what you played, so you can pick things back up."
        />
      </>
    );
  }

  return (
    <>
      <MobileHeader title="History" />

      {!saveHistory && hydrated && (
        <div className="px-4 pt-4 lg:px-6 lg:pt-8">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-[0.8125rem] text-[var(--text-dim)]">
              History saving is turned off, so nothing new is being recorded.{" "}
              <Link href="/settings" className="text-[var(--accent)] underline underline-offset-2">
                Turn it back on in Settings
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <TrackListView
        title="Recently played"
        tracks={tracks}
        loading={loading}
        error={error}
        onRetry={load}
        context={{ type: "history", id: null, name: "Recently played" }}
        subtitleFor={(t) => {
          const e = tracks.find((x) => x.videoId === t.videoId);
          return e ? `${cleanArtist(t)} · ${relativeTime(e.playedAt)}` : undefined;
        }}
        headerExtra={
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            <IconTrash size={16} /> Clear history
          </Button>
        }
        empty={
          <EmptyState
            icon={<IconHistory size={26} />}
            title="Nothing played yet"
            body="Once you start listening, the last 500 tracks you played show up here."
            action={
              <Link href="/search">
                <Button variant="primary">Start listening</Button>
              </Link>
            }
          />
        }
      />

      <ConfirmDialog
        open={confirm}
        title="Clear listening history?"
        body="This removes every entry from your history on this account. Favorites and playlists are untouched."
        confirmLabel="Clear history"
        onConfirm={clearAll}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}

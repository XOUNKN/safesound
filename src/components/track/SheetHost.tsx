"use client";

import { useEffect, useMemo, useState } from "react";
import { api, describeError } from "@/lib/api";
import { cleanArtist, cleanTitle, pluralize } from "@/lib/format";
import {
  addToQueue,
  addTracksToPlaylist,
  bumpRevision,
  closeSheet,
  createPlaylist,
  loadPlaylists,
  openSheet,
  playNext,
  playTrack,
  removeFromQueue,
  toast,
  toggleFavorite,
  useStore,
} from "@/lib/store";
import type { Playlist, Track } from "@/lib/types";
import {
  IconExternal,
  IconHeart,
  IconPlay,
  IconPlaylist,
  IconPlus,
  IconQueue,
  IconTrash,
} from "@/components/ui/Icons";
import { Button, EmptyState, Spinner, TextField } from "@/components/ui/primitives";
import { Sheet, SheetItem } from "@/components/ui/Sheet";
import { Artwork, CoverCollage } from "./Artwork";

/** Renders whichever global sheet the store currently has open. */
export default function SheetHost() {
  const sheet = useStore((s) => s.sheet);

  if (!sheet) return null;
  if (sheet.kind === "track-menu") return <TrackMenu {...sheet} />;
  if (sheet.kind === "add-to-playlist") return <AddToPlaylist tracks={sheet.tracks} />;
  if (sheet.kind === "create-playlist") return <CreatePlaylist tracks={sheet.tracks} />;
  return null;
}

/* ------------------------------ track menu ----------------------------- */

function TrackMenu({
  track,
  origin,
  entryId,
  playlistId,
}: {
  track: Track;
  origin: "search" | "queue" | "playlist" | "library";
  entryId?: string;
  playlistId?: string;
}) {
  const isFav = useStore((s) => s.favorites.has(track.videoId));
  const signedIn = useStore((s) => Boolean(s.user));
  const queueQid = useStore(
    (s) => s.queue.find((i) => i.track.videoId === track.videoId)?.qid ?? null,
  );
  const [removing, setRemoving] = useState(false);

  const title = cleanTitle(track.title);

  const run = (fn: () => void) => () => {
    fn();
    closeSheet();
  };

  async function removeFromPlaylist() {
    if (!playlistId || !entryId) return;
    setRemoving(true);
    try {
      await api.del(`/api/playlists/${playlistId}/tracks/${entryId}`);
      bumpRevision();
      void loadPlaylists();
      toast("Removed from playlist", { tone: "success" });
      closeSheet();
    } catch (err) {
      const { message, hint } = describeError(err);
      toast(message, { tone: "error", hint });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Sheet open onClose={closeSheet} size="sm">
      <div className="flex items-center gap-3 px-3.5 pt-1 pb-3">
        <Artwork track={track} className="h-14 w-14 shrink-0" rounded="rounded-[var(--r-sm)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-[var(--text)]">{title}</p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--text-dim)]">
            {cleanArtist(track.channelTitle)}
          </p>
        </div>
      </div>

      <div className="h-px bg-[var(--border-soft)]" />

      <div className="py-1.5">
        <SheetItem icon={<IconPlay size={19} filled={false} />} label="Play now" onClick={run(() => playTrack(track))} />
        <SheetItem icon={<IconQueue size={19} />} label="Play next" onClick={run(() => playNext([track]))} />
        <SheetItem icon={<IconPlus size={19} />} label="Add to queue" onClick={run(() => addToQueue([track], "end"))} />
        <SheetItem
          icon={<IconPlaylist size={19} />}
          label="Add to playlist"
          onClick={() => openSheet({ kind: "add-to-playlist", tracks: [track] })}
          disabled={!signedIn}
          sublabel={signedIn ? undefined : "Sign in to build playlists"}
        />
        <SheetItem
          icon={<IconHeart size={19} filled={isFav} />}
          label={isFav ? "Remove from Favorites" : "Save to Favorites"}
          onClick={run(() => void toggleFavorite(track))}
          disabled={!signedIn}
          sublabel={signedIn ? undefined : "Sign in to save favorites"}
        />

        {origin === "queue" && queueQid && (
          <SheetItem
            icon={<IconTrash size={19} />}
            label="Remove from queue"
            danger
            onClick={run(() => removeFromQueue(queueQid))}
          />
        )}
        {origin === "playlist" && entryId && playlistId && (
          <SheetItem
            icon={removing ? <Spinner size={19} /> : <IconTrash size={19} />}
            label="Remove from this playlist"
            danger
            disabled={removing}
            onClick={removeFromPlaylist}
          />
        )}

        <div className="my-1.5 h-px bg-[var(--border-soft)]" />
        <SheetItem
          icon={<IconExternal size={19} />}
          label="Open on YouTube"
          sublabel="youtube.com — the source of this track"
          href={`https://www.youtube.com/watch?v=${track.videoId}`}
        />
      </div>
    </Sheet>
  );
}

/* --------------------------- add to playlist --------------------------- */

function AddToPlaylist({ tracks }: { tracks: Track[] }) {
  const playlists = useStore((s) => s.playlists);
  const loaded = useStore((s) => s.playlistsLoaded);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!loaded) void loadPlaylists();
  }, [loaded]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? playlists.filter((p) => p.name.toLowerCase().includes(q)) : playlists;
  }, [playlists, filter]);

  async function add(p: Playlist) {
    setBusy(p.id);
    try {
      await addTracksToPlaylist(p.id, tracks);
      closeSheet();
    } catch (err) {
      const { message, hint } = describeError(err);
      toast(message, { tone: "error", hint });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet
      open
      onClose={closeSheet}
      title="Add to playlist"
      description={
        tracks.length === 1 ? cleanTitle(tracks[0]!.title) : `${pluralize(tracks.length, "track")} selected`
      }
    >
      <div className="px-3.5 pb-2">
        <button
          type="button"
          onClick={() => openSheet({ kind: "create-playlist", tracks })}
          className="flex w-full items-center gap-3.5 rounded-[var(--r-sm)] border border-dashed border-[var(--border)] px-3.5 py-3 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[var(--accent)]">
            <IconPlus size={20} />
          </span>
          <span className="text-[0.9375rem] font-medium text-[var(--text)]">New playlist</span>
        </button>
      </div>

      {playlists.length > 6 && (
        <div className="px-3.5 pb-2">
          <TextField
            placeholder="Filter playlists"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter playlists"
          />
        </div>
      )}

      {!loaded ? (
        <div className="grid place-items-center py-10 text-[var(--text-mute)]">
          <Spinner />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<IconPlaylist size={24} />}
          title={playlists.length ? "No playlists match that" : "No playlists yet"}
          body={playlists.length ? undefined : "Create one above and this track goes straight into it."}
        />
      ) : (
        <div className="pb-2">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => void add(p)}
              className="flex w-full items-center gap-3.5 rounded-[var(--r-sm)] px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              <CoverCollage covers={p.covers} className="h-11 w-11 shrink-0" rounded="rounded-[var(--r-sm)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] text-[var(--text)]">{p.name}</span>
                <span className="mt-0.5 block text-[0.75rem] text-[var(--text-mute)]">
                  {pluralize(p.trackCount, "track")}
                </span>
              </span>
              {busy === p.id && <Spinner size={17} />}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* --------------------------- create playlist --------------------------- */

function CreatePlaylist({ tracks }: { tracks?: Track[] }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the playlist a name.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await createPlaylist(trimmed, tracks);
      closeSheet();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={closeSheet}
      title="New playlist"
      description={
        tracks?.length
          ? `${pluralize(tracks.length, "track")} will be added right away`
          : "Give it a name — you can add tracks any time."
      }
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4 px-3.5 pt-1 pb-4">
        <TextField
          data-autofocus
          label="Playlist name"
          placeholder="Late night drive"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" className="flex-1" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={busy}>
            Create
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

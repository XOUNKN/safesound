"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import { formatTotalDuration, pluralize } from "@/lib/format";
import {
  addToQueue,
  bumpRevision,
  loadPlaylists,
  openSheet,
  playCollection,
  shuffleCollection,
  toast,
  useStore,
} from "@/lib/store";
import type { PlaylistDetail, PlaylistTrack } from "@/lib/types";
import { MobileHeader } from "@/components/nav/Navigation";
import { CoverCollage } from "@/components/track/Artwork";
import { TrackRow } from "@/components/track/TrackRow";
import { useReorder } from "@/components/dnd/useReorder";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
  TrackRowSkeleton,
} from "@/components/ui/primitives";
import { Sheet, SheetItem, ConfirmDialog } from "@/components/ui/Sheet";
import {
  IconChevronLeft,
  IconDrag,
  IconEdit,
  IconLink,
  IconLock,
  IconMore,
  IconPlay,
  IconPlaylist,
  IconQueue,
  IconSearch,
  IconShare,
  IconShuffle,
  IconTrash,
} from "@/components/ui/Icons";
import { TextField } from "@/components/ui/primitives";

export default function PlaylistDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const revision = useStore((s) => s.revision);
  const hydrated = useStore((s) => s.hydrated);
  const user = useStore((s) => s.user);

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setStatus("loading");
    try {
      const res = await api.get<{ playlist: PlaylistDetail }>(`/api/playlists/${id}`);
      setPlaylist(res.playlist);
      setTracks(res.playlist.tracks);
      setStatus("ready");
    } catch (err) {
      setError(describeError(err));
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    if (hydrated && user) void load();
  }, [hydrated, user, revision, load]);

  /* ---- reorder ---- */
  const onMove = useCallback(
    (from: number, to: number) => {
      setTracks((prev) => {
        const nextTracks = [...prev];
        const [moved] = nextTracks.splice(from, 1);
        if (!moved) return prev;
        nextTracks.splice(to, 0, moved);
        if (id) {
          api
            .post(`/api/playlists/${id}/reorder`, { entryIds: nextTracks.map((t) => t.entryId) })
            .catch((err) => {
              const { message, hint } = describeError(err);
              toast(message, { tone: "error", hint });
              void load(); // resync with the server's truth
            });
        }
        return nextTracks;
      });
    },
    [id, load],
  );

  const { listProps, itemProps, handleProps } = useReorder(onMove);

  if (hydrated && !user) {
    return (
      <>
        <MobileHeader title="Playlist" />
        <EmptyState
          icon={<IconLock size={26} />}
          title="Sign in to open this playlist"
          body="Playlists are private to the account that made them."
          action={
            <Link href="/login">
              <Button variant="primary">Sign in</Button>
            </Link>
          }
        />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <MobileHeader title="Playlist" />
        <div className="px-4 pt-6 lg:px-6">
          <ErrorState
            title={error?.message ?? "That playlist couldn't be opened."}
            hint={error?.hint}
            onRetry={() => void load()}
          />
          <div className="mt-4">
            <Link href="/playlists">
              <Button variant="secondary">Back to playlists</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const total = tracks.reduce((n, t) => n + t.durationSec, 0);

  async function rename(name: string) {
    if (!id) return;
    try {
      await api.patch(`/api/playlists/${id}`, { name });
      setRenaming(false);
      bumpRevision();
      void loadPlaylists();
      toast("Playlist renamed", { tone: "success" });
    } catch (err) {
      const { message, hint } = describeError(err);
      toast(message, { tone: "error", hint });
    }
  }

  async function remove() {
    if (!id) return;
    try {
      await api.del(`/api/playlists/${id}`);
      setConfirmDelete(false);
      bumpRevision();
      void loadPlaylists();
      toast("Playlist deleted", { tone: "success" });
      router.push("/playlists");
    } catch (err) {
      const { message, hint } = describeError(err);
      toast(message, { tone: "error", hint });
    }
  }

  async function setVisibility(visibility: "private" | "unlisted") {
    if (!id) return;
    try {
      const res = await api.patch<{ playlist: PlaylistDetail }>(`/api/playlists/${id}`, {
        visibility,
      });
      setPlaylist((p) => (p ? { ...p, ...res.playlist } : p));
      bumpRevision();
      if (visibility === "unlisted" && res.playlist.shareToken) {
        await copyShareLink(res.playlist.shareToken);
      } else {
        toast("Playlist is private again", {
          tone: "success",
          hint: "Any link you shared before no longer works.",
        });
      }
    } catch (err) {
      const { message, hint } = describeError(err);
      toast(message, { tone: "error", hint });
    }
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: playlist?.name ?? "Playlist", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Share link copied", { tone: "success", hint: "Anyone with the link can view it." });
    } catch {
      // Clipboard can be blocked; show the link so it can still be copied by hand.
      toast("Share link ready", { tone: "info", hint: url });
    }
  }

  return (
    <>
      <MobileHeader
        title={playlist?.name ?? "Playlist"}
        action={
          <button
            type="button"
            aria-label="Playlist options"
            onClick={() => setMenuOpen(true)}
            className="rounded-full p-2 text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <IconMore size={20} />
          </button>
        }
      />

      <div className="px-4 pt-5 lg:px-6 lg:pt-8">
        <Link
          href="/playlists"
          className="mb-4 hidden items-center gap-1 text-[0.8125rem] text-[var(--text-dim)] hover:text-[var(--text)] lg:inline-flex"
        >
          <IconChevronLeft size={16} /> Playlists
        </Link>

        <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
          {status === "loading" && !playlist ? (
            <Skeleton className="aspect-square w-40 rounded-2xl sm:w-52" />
          ) : (
            <CoverCollage
              covers={playlist?.covers ?? []}
              className="aspect-square w-40 shrink-0 shadow-[var(--shadow-lg)] sm:w-52"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--text-mute)] uppercase">
              Playlist{playlist?.visibility === "unlisted" ? " · shared by link" : " · private"}
            </p>
            {playlist ? (
              <h1 className="mt-1.5 text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
                {playlist.name}
              </h1>
            ) : (
              <Skeleton className="mt-2 h-8 w-48" />
            )}
            <p className="mt-2 text-[0.8125rem] text-[var(--text-dim)]">
              {pluralize(tracks.length, "track")}
              {total > 0 && ` · ${formatTotalDuration(total)}`}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="lg"
                disabled={!tracks.length}
                onClick={() =>
                  playlist &&
                  playCollection(tracks, 0, {
                    type: "playlist",
                    id: playlist.id,
                    name: playlist.name,
                  })
                }
              >
                <IconPlay size={18} /> Play
              </Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={tracks.length < 2}
                onClick={() =>
                  playlist &&
                  shuffleCollection(tracks, {
                    type: "playlist",
                    id: playlist.id,
                    name: playlist.name,
                  })
                }
              >
                <IconShuffle size={18} /> Shuffle
              </Button>
              <IconButton label="Playlist options" onClick={() => setMenuOpen(true)} className="hidden lg:inline-grid">
                <IconMore size={21} />
              </IconButton>
            </div>
          </div>
        </header>
      </div>

      <div className="mt-7 px-2 lg:px-4">
        {status === "loading" && !playlist ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <EmptyState
            icon={<IconPlaylist size={26} />}
            title="This playlist is empty"
            body="Find something you like and use the ••• menu to add it here."
            action={
              <Link href="/search">
                <Button variant="primary">
                  <IconSearch size={17} /> Search for music
                </Button>
              </Link>
            }
          />
        ) : (
          <div {...listProps} className="space-y-0.5">
            {tracks.map((track, i) => (
              <div key={track.entryId} {...itemProps(i)}>
                <TrackRow
                  track={track}
                  index={i}
                  showIndex
                  onPlay={() =>
                    playlist &&
                    playCollection(tracks, i, {
                      type: "playlist",
                      id: playlist.id,
                      name: playlist.name,
                    })
                  }
                  menu={{
                    kind: "track-menu",
                    track,
                    origin: "playlist",
                    entryId: track.entryId,
                    playlistId: playlist?.id,
                  }}
                  trailing={
                    <span
                      {...handleProps(i, tracks.length)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Reorder ${track.title}. Use arrow keys to move.`}
                      className="hidden shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-[var(--text-mute)] hover:text-[var(--text)] active:cursor-grabbing sm:block"
                    >
                      <IconDrag size={17} />
                    </span>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------- sheets ---------------------------- */}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={playlist?.name} size="sm">
        <div className="py-1.5">
          <SheetItem
            icon={<IconEdit size={19} />}
            label="Rename playlist"
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
          />
          <SheetItem
            icon={<IconShuffle size={19} />}
            label="Shuffle play"
            disabled={tracks.length < 2}
            onClick={() => {
              setMenuOpen(false);
              if (playlist)
                shuffleCollection(tracks, { type: "playlist", id: playlist.id, name: playlist.name });
            }}
          />
          <SheetItem
            icon={<IconQueue size={19} />}
            label="Add all to queue"
            disabled={!tracks.length}
            onClick={() => {
              setMenuOpen(false);
              addToQueue(tracks, "end");
            }}
          />
          <SheetItem
            icon={<IconPlaylist size={19} />}
            label="Copy into another playlist"
            disabled={!tracks.length}
            onClick={() => {
              setMenuOpen(false);
              openSheet({ kind: "add-to-playlist", tracks });
            }}
          />

          <div className="my-1.5 h-px bg-[var(--border-soft)]" />

          {playlist?.visibility === "unlisted" ? (
            <>
              <SheetItem
                icon={<IconLink size={19} />}
                label="Copy share link"
                sublabel="Anyone with the link can view this playlist"
                onClick={() => {
                  setMenuOpen(false);
                  if (playlist.shareToken) void copyShareLink(playlist.shareToken);
                }}
              />
              <SheetItem
                icon={<IconLock size={19} />}
                label="Make private"
                sublabel="Existing links stop working immediately"
                onClick={() => {
                  setMenuOpen(false);
                  void setVisibility("private");
                }}
              />
            </>
          ) : (
            <SheetItem
              icon={<IconShare size={19} />}
              label="Share with a link"
              sublabel="Creates an unlisted, view-only link"
              onClick={() => {
                setMenuOpen(false);
                void setVisibility("unlisted");
              }}
            />
          )}

          <div className="my-1.5 h-px bg-[var(--border-soft)]" />

          <SheetItem
            icon={<IconTrash size={19} />}
            label="Delete playlist"
            danger
            onClick={() => {
              setMenuOpen(false);
              setConfirmDelete(true);
            }}
          />
        </div>
      </Sheet>

      <RenameSheet
        open={renaming}
        initial={playlist?.name ?? ""}
        onClose={() => setRenaming(false)}
        onSave={rename}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${playlist?.name ?? "this playlist"}"?`}
        body={`${pluralize(tracks.length, "track")} will be removed from this playlist. The tracks themselves stay on YouTube and in your favorites.`}
        confirmLabel="Delete playlist"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function RenameSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setName(initial);
      setError(undefined);
    }
  }, [open, initial]);

  return (
    <Sheet open={open} onClose={onClose} title="Rename playlist" size="sm">
      <form
        className="space-y-4 px-3.5 pt-1 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return setError("Playlist names can't be empty.");
          onSave(trimmed);
        }}
      >
        <TextField
          data-autofocus
          label="Name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Save
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

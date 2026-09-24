"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, describeError } from "@/lib/api";
import {
  bumpRevision,
  setVolume,
  signOut,
  toast,
  updateSettings,
  useStore,
} from "@/lib/store";
import type { PublicUser } from "@/lib/types";
import { MobileHeader, Avatar } from "@/components/nav/Navigation";
import { Section, Row, ToggleRow, OptionRows, UnavailableCard } from "@/components/settings/controls";
import { Button, IconButton, TextField } from "@/components/ui/primitives";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import { IconSignOut, IconVolume } from "@/components/ui/Icons";

/** Must match the server's accent enum and the `data-accent` blocks in globals.css. */
const ACCENTS: { value: string; label: string; swatch: string }[] = [
  { value: "ember", label: "Ember", swatch: "linear-gradient(135deg,#ffbe00,#e85e0a)" },
  { value: "violet", label: "Violet", swatch: "linear-gradient(135deg,#a78bfa,#7c3aed)" },
  { value: "cyan", label: "Cyan", swatch: "linear-gradient(135deg,#67e8f9,#0891b2)" },
  { value: "rose", label: "Rose", swatch: "linear-gradient(135deg,#fda4af,#e11d48)" },
  { value: "lime", label: "Lime", swatch: "linear-gradient(135deg,#d9f99d,#65a30d)" },
];

const CROSSFADE = [0, 2, 4, 6, 8, 10];

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const hydrated = useStore((s) => s.hydrated);
  const settings = useStore((s) => s.settings);
  const volume = useStore((s) => s.volume);
  const router = useRouter();

  const [editProfile, setEditProfile] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <>
      <MobileHeader title="Settings" />

      <div className="px-4 pt-4 pb-4 lg:px-6 lg:pt-8">
        <h1 className="hidden text-2xl font-semibold tracking-tight lg:block">Settings</h1>

        {/* ------------------------------ account ----------------------------- */}
        <Section title="Account">
          {user ? (
            <>
              <div className="flex items-center gap-4 border-b border-[var(--border-soft)] px-4 py-4">
                <Avatar size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium text-[var(--text)]">
                    {user.displayName}
                  </p>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--text-dim)]">
                    @{user.username}
                  </p>
                  <p className="mt-0.5 truncate text-[0.75rem] text-[var(--text-mute)]">
                    {user.email}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditProfile(true)}>
                  Edit
                </Button>
              </div>
              <Row label="Change password" onClick={() => setChangePassword(true)} />
              <Row label="Sign out" danger onClick={() => setConfirmSignOut(true)}>
                <span className="shrink-0 text-[var(--danger)]">
                  <IconSignOut size={19} />
                </span>
              </Row>
            </>
          ) : (
            <div className="px-4 py-5">
              <p className="text-[0.9375rem] font-medium text-[var(--text)]">
                You&rsquo;re not signed in
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
                Playback works without an account, but playlists, favorites and history need one.
              </p>
              <div className="mt-4 flex gap-2.5">
                <Link href="/login">
                  <Button variant="primary">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="secondary">Create account</Button>
                </Link>
              </div>
            </div>
          )}
        </Section>

        {/* ---------------------------- appearance ---------------------------- */}
        <Section title="Appearance">
          <div className="border-b border-[var(--border-soft)] px-4 py-4">
            <p className="text-[0.9375rem] text-[var(--text)]">Accent colour</p>
            <div className="mt-3 flex gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  aria-label={a.label}
                  aria-pressed={settings.accent === a.value}
                  onClick={() => updateSettings({ accent: a.value })}
                  className={`h-9 w-9 rounded-full transition-transform ${
                    settings.accent === a.value
                      ? "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]"
                      : "hover:scale-110"
                  }`}
                  style={{ background: a.swatch }}
                />
              ))}
            </div>
          </div>
          <ToggleRow
            label="Reduce motion"
            description="Turns off transitions and animated effects across the app."
            checked={settings.reduceMotion}
            onChange={(reduceMotion) => updateSettings({ reduceMotion })}
          />
        </Section>

        {/* ----------------------------- playback ----------------------------- */}
        <Section title="Playback">
          <ToggleRow
            label="Skip unplayable tracks"
            description="If a video is private, deleted or blocked in your region, move on to the next one automatically."
            checked={settings.autoplay}
            onChange={(autoplay) => updateSettings({ autoplay })}
          />
          <ToggleRow
            label="Replace queue when playing a track"
            description="On: playing a single track starts a fresh queue. Off: it slots in right after whatever is playing."
            checked={settings.clearQueueOnPlay}
            onChange={(clearQueueOnPlay) => updateSettings({ clearQueueOnPlay })}
          />
        </Section>

        {/* ------------------------------ queue ------------------------------- */}
        <Section title="Queue">
          <OptionRows
            name="Where new tracks go"
            value={settings.queueAddPosition}
            onChange={(queueAddPosition) => updateSettings({ queueAddPosition })}
            options={[
              { value: "end", label: "Add to the end", description: "New tracks wait their turn." },
              { value: "next", label: "Play next", description: "New tracks jump the queue." },
            ]}
          />
        </Section>

        {/* ---------------------------- crossfade ----------------------------- */}
        <Section
          title="Crossfade"
          description="Blend the end of each song into the start of the next, so the music never stops."
        >
          <OptionRows
            name="Crossfade length"
            value={settings.crossfadeSec}
            onChange={(crossfadeSec) => updateSettings({ crossfadeSec })}
            options={CROSSFADE.map((n) => ({
              value: n,
              label: n === 0 ? "Off" : `${n} seconds`,
              description:
                n === 0
                  ? "Tracks change instantly when one ends."
                  : undefined,
            }))}
          />
        </Section>

        {/* ------------------------------ audio ------------------------------- */}
        <Section title="Audio">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.9375rem] text-[var(--text)]">Volume</p>
              <span className="text-[0.8125rem] tabular-nums text-[var(--text-mute)]">{volume}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[var(--text-mute)]">
                <IconVolume size={18} level={volume === 0 ? 0 : volume < 55 ? 1 : 2} />
              </span>
              <input
                type="range"
                className="track-range flex-1"
                min={0}
                max={100}
                value={volume}
                aria-label="Volume"
                style={{ ["--fill" as string]: `${volume}%` }}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
            <p className="mt-2.5 text-[0.75rem] leading-relaxed text-[var(--text-mute)]">
              On iPhone and iPad, use the volume buttons on the side instead.
            </p>
          </div>
        </Section>

        {/* ------------------------------ lyrics ------------------------------ */}
        <Section
          title="Lyrics"
          description="Time-synced lyrics from LRCLIB, a free community lyrics library."
        >
          <ToggleRow
            label="Enable lyrics"
            checked={settings.lyricsEnabled}
            onChange={(lyricsEnabled) => updateSettings({ lyricsEnabled })}
          />
          <ToggleRow
            label="Follow along automatically"
            description="Scrolls to the current line when the provider has time-synced lyrics."
            checked={settings.lyricsAutoscroll}
            onChange={(lyricsAutoscroll) => updateSettings({ lyricsAutoscroll })}
            disabled={!settings.lyricsEnabled}
          />
        </Section>

        {/* --------------------------- notifications -------------------------- */}
        <NotificationsSection />

        {/* ------------------------------ privacy ----------------------------- */}
        <Section title="Privacy">
          <ToggleRow
            label="Save listening history"
            description="Powers “Jump back in” and the recommendations shelf."
            checked={settings.saveHistory}
            onChange={(saveHistory) => updateSettings({ saveHistory })}
            disabled={!user}
          />
          <ToggleRow
            label="Save recent searches"
            checked={settings.saveSearchHistory}
            onChange={(saveSearchHistory) => updateSettings({ saveSearchHistory })}
            disabled={!user}
          />
          <Row
            label="Clear listening history"
            onClick={async () => {
              try {
                await api.del("/api/history");
                bumpRevision();
                toast("Listening history cleared", { tone: "success" });
              } catch (err) {
                const { message, hint } = describeError(err);
                toast(message, { tone: "error", hint });
              }
            }}
          />
          <Row
            label="Clear recent searches"
            onClick={async () => {
              try {
                await api.del("/api/search/history");
                bumpRevision();
                toast("Recent searches cleared", { tone: "success" });
              } catch (err) {
                const { message, hint } = describeError(err);
                toast(message, { tone: "error", hint });
              }
            }}
          />
        </Section>

        {/* ------------------------------- about ------------------------------ */}
        <Section title="About">
          <Row label="Resonate" description="Version 1.0.0" />
          <Row label="Attribution & legal" onClick={() => router.push("/legal")} />
          <div className="px-4 py-4">
            <p className="text-[0.75rem] leading-relaxed text-[var(--text-mute)]">
              Resonate is an independent player built on YouTube&rsquo;s official Data API and IFrame
              Player. It is not affiliated with, endorsed by, or connected to YouTube, Google, or any
              other music service. All playback happens in YouTube&rsquo;s own player; nothing is
              downloaded, proxied or re-hosted.
            </p>
          </div>
        </Section>

        <div className="h-10" />
      </div>

      {user && (
        <>
          <EditProfileSheet open={editProfile} user={user} onClose={() => setEditProfile(false)} />
          <ChangePasswordSheet open={changePassword} onClose={() => setChangePassword(false)} />
          <ConfirmDialog
            open={confirmSignOut}
            title="Sign out of Resonate?"
            body="Your playlists, favorites and queue stay safe in your account."
            confirmLabel="Sign out"
            onConfirm={async () => {
              setConfirmSignOut(false);
              await signOut();
              toast("Signed out");
              router.push("/");
            }}
            onCancel={() => setConfirmSignOut(false)}
          />
        </>
      )}
    </>
  );
}

/* --------------------------- notifications ---------------------------- */

function NotificationsSection() {
  const settings = useStore((s) => s.settings);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  if (permission === "unsupported") {
    return (
      <Section title="Notifications">
        <UnavailableCard
          title="Desktop notifications"
          reason="This browser doesn't expose the Notifications API, so Resonate can't post anything to your system."
          instead="In-app messages still appear at the bottom of the screen."
        />
      </Section>
    );
  }

  return (
    <Section title="Notifications">
      <ToggleRow
        label="Tell me when the queue runs out"
        description={
          permission === "denied"
            ? "Notifications are blocked for this site in your browser settings. Resonate will show an in-app message instead."
            : "Posts a system notification when the last track finishes."
        }
        checked={settings.notifyQueueEnd}
        onChange={async (on) => {
          if (on && permission === "default") {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== "granted") {
              updateSettings({ notifyQueueEnd: true });
              toast("Notifications weren't allowed", {
                tone: "info",
                hint: "Resonate will show an in-app message instead.",
              });
              return;
            }
          }
          updateSettings({ notifyQueueEnd: on });
        }}
      />
      <div className="px-4 py-3.5">
        <p className="text-[0.75rem] leading-relaxed text-[var(--text-mute)]">
          Resonate also publishes track info to your system&rsquo;s media controls (lock screen,
          keyboard play/pause keys) whenever your browser supports it.
        </p>
      </div>
    </Section>
  );
}

/* ------------------------------- sheets ------------------------------- */

function EditProfileSheet({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: PublicUser;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [emoji, setEmoji] = useState(user.avatarEmoji);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setDisplayName(user.displayName);
      setUsername(user.username);
      setEmoji(user.avatarEmoji);
      setError(undefined);
    }
  }, [open, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.patch("/api/me", {
        displayName: displayName.trim(),
        username: username.trim(),
        avatarEmoji: emoji.trim(),
      });
      const { bootstrap } = await import("@/lib/store");
      await bootstrap();
      toast("Profile updated", { tone: "success" });
      onClose();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" size="sm">
      <form onSubmit={submit} className="space-y-4 px-3.5 pt-1 pb-4">
        <TextField
          data-autofocus
          label="Display name"
          value={displayName}
          maxLength={60}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <TextField
          label="Username"
          value={username}
          maxLength={24}
          onChange={(e) => setUsername(e.target.value)}
          error={error}
        />
        <TextField
          label="Avatar emoji"
          value={emoji}
          maxLength={8}
          placeholder="Leave blank to use your initial"
          onChange={(e) => setEmoji(e.target.value)}
        />
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setError(undefined);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.put<{ message: string }>("/api/me", {
        currentPassword: current,
        newPassword: next,
      });
      toast(res.message, { tone: "success" });
      onClose();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Change password" size="sm">
      <form onSubmit={submit} className="space-y-4 px-3.5 pt-1 pb-4">
        <TextField
          data-autofocus
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={error}
          hint="At least 8 characters. Every other device will be signed out."
        />
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={busy}>
            Update
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bootstrap,
  getState,
  loadPlaylists,
  next,
  openSheet,
  previous,
  seek,
  setVolume,
  toggleMute,
  togglePlay,
  useStore,
} from "@/lib/store";
import { BottomNav, MobileDrawer, Sidebar, TopHeader } from "@/components/nav/Navigation";
import PlayerDock from "@/components/player/PlayerDock";
import MediaSession from "@/components/player/MediaSession";
import QueuePanel from "@/components/player/QueuePanel";
import LyricsPanel from "@/components/player/LyricsPanel";
import SheetHost from "@/components/track/SheetHost";
import Toasts from "@/components/ui/Toasts";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const accent = useStore((s) => s.settings.accent);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  const userId = useStore((s) => s.user?.id ?? null);
  const hasPlayer = useStore((s) => s.queue.length > 0);
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    void bootstrap();
    try {
      setCollapsed(localStorage.getItem("resonate:sidebar") === "collapsed");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (userId) void loadPlaylists();
  }, [userId]);

  /* ---- accent (theme is always dark) ---- */
  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    try {
      localStorage.setItem("resonate:accent", accent);
    } catch {
      /* private mode */
    }
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "1" : "0";
  }, [reduceMotion]);

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("resonate:sidebar", next ? "collapsed" : "expanded");
      } catch {
        /* private mode */
      }
      return next;
    });
  }

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/" && !typing) {
        e.preventDefault();
        router.push("/search");
        return;
      }
      if (typing) return;

      const { positionSec, volume } = getState();
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) next(false);
          else seek(positionSec + 5);
          break;
        case "ArrowLeft":
          if (e.shiftKey) previous();
          else seek(Math.max(0, positionSec - 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(volume + 5);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(volume - 5);
          break;
        case "m":
          toggleMute();
          break;
        case "q":
          openSheet({ kind: "queue" });
          break;
        case "l":
          openSheet({ kind: "lyrics" });
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const sidebarPad = collapsed ? "lg:pl-[var(--sidebar-w-collapsed)]" : "lg:pl-[var(--sidebar-w)]";

  return (
    <>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className={sidebarPad}>
        <TopHeader onOpenMenu={() => setDrawerOpen(true)} />
        <main
          id="main"
          className={`mx-auto w-full max-w-[1400px] ${
            hasPlayer
              ? "pb-[calc(var(--nav-h)+var(--mini-h)+env(safe-area-inset-bottom,0px)+1rem)] lg:pb-[calc(var(--mini-h)+1.5rem)]"
              : "pb-[calc(var(--nav-h)+env(safe-area-inset-bottom,0px)+1rem)] lg:pb-10"
          }`}
        >
          {children}
        </main>
      </div>

      <PlayerDock sidebarCollapsed={collapsed} />
      <MediaSession />
      <BottomNav />
      <QueuePanel />
      <LyricsPanel />
      <SheetHost />
      <Toasts />
    </>
  );
}

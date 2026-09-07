"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import {
  IconChevronLeft,
  IconClose,
  IconHeart,
  IconHistory,
  IconHome,
  IconLibrary,
  IconMenu,
  IconPlaylist,
  IconSearch,
  IconSettings,
  IconUpload,
  IconUser,
} from "@/components/ui/Icons";

type Item = { href: string; label: string; icon: (p: { size?: number }) => React.ReactElement };

const BROWSE: Item[] = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/library", label: "Library", icon: IconLibrary },
];

const COLLECTION: Item[] = [
  { href: "/playlists", label: "Playlists", icon: IconPlaylist },
  { href: "/favorites", label: "Favorites", icon: IconHeart },
  { href: "/history", label: "History", icon: IconHistory },
];

/** Bottom bar on phones — the sidebar is a drawer there. */
const MOBILE_TABS: Item[] = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/library", label: "Library", icon: IconLibrary },
  { href: "/playlists", label: "Playlists", icon: IconPlaylist },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/* ============================ Desktop sidebar =========================== */

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const user = useStore((s) => s.user);
  const playlists = useStore((s) => s.playlists);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-40 hidden flex-col bg-[var(--surface)] lg:flex"
      style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
    >
      <div className={`flex h-[var(--header-h)] shrink-0 items-center ${collapsed ? "justify-center px-0" : "justify-between px-5"}`}>
        <Link href="/" aria-label="Resonate home">
          {collapsed ? <LogoMark size={28} /> : <Wordmark size={26} />}
        </Link>
        {!collapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={onToggle}
            className="grid h-8 w-8 place-items-center rounded-[var(--r-sm)] text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <IconChevronLeft size={18} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 pb-4">
        <NavGroup label="Browse" items={BROWSE} pathname={pathname} collapsed={collapsed} />
        <NavGroup label="Your Collection" items={COLLECTION} pathname={pathname} collapsed={collapsed} className="mt-6" />

        {!collapsed && playlists.length > 0 && (
          <>
            <p className="eyebrow mt-6 mb-2 px-3">Playlists</p>
            <ul className="space-y-0.5">
              {playlists.slice(0, 20).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/playlists/${p.id}`}
                    className={`block truncate rounded-[var(--r-sm)] px-3 py-1.5 text-[0.8125rem] transition-colors ${
                      pathname === `/playlists/${p.id}`
                        ? "text-[var(--text)]"
                        : "text-[var(--text-dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex-1" />

        {collapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={onToggle}
            className="mx-auto mb-1 grid h-9 w-9 place-items-center rounded-[var(--r-sm)] text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <IconChevronLeft size={18} className="rotate-180" />
          </button>
        ) : null}

        <Link
          href={user ? "/settings" : "/login"}
          className={`mt-3 flex items-center rounded-[var(--r-md)] transition-colors hover:bg-[var(--surface-2)] ${
            collapsed ? "justify-center p-1.5" : "gap-3 p-2"
          }`}
          title={user ? user.displayName : "Sign in"}
        >
          <Avatar />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-[var(--text)]">
                {user ? user.displayName : "Sign in"}
              </span>
              <span className="block truncate text-[0.6875rem] text-[var(--text-mute)]">
                {user ? "My Library" : "Save your music"}
              </span>
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
  className = "",
}: {
  label: string;
  items: Item[];
  pathname: string;
  collapsed: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {!collapsed && <p className="eyebrow mb-2 px-3">{label}</p>}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: Item;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center rounded-[var(--r-md)] text-[0.875rem] font-medium transition-colors ${
        collapsed ? "justify-center px-0 py-2.5" : "gap-3.5 px-3 py-2.5"
      } ${
        active
          ? "bg-[var(--surface-2)] text-[var(--text)]"
          : "text-[var(--text-dim)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text)]"
      }`}
    >
      {active && (
        <span className="brand-gradient absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full" aria-hidden="true" />
      )}
      <Icon size={21} />
      {!collapsed && item.label}
    </Link>
  );
}

/* ============================= Mobile drawer =========================== */

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const user = useStore((s) => s.user);
  const playlists = useStore((s) => s.playlists);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Close whenever the route changes.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="animate-drawer pt-safe pb-safe absolute inset-y-0 left-0 flex w-[17rem] max-w-[82vw] flex-col bg-[var(--surface)] shadow-[var(--shadow-lg)]"
      >
        <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between px-5">
          <Link href="/" aria-label="Resonate home">
            <Wordmark size={26} />
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[var(--r-sm)] text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
          <NavGroup label="Browse" items={BROWSE} pathname={pathname} collapsed={false} />
          <NavGroup
            label="Your Collection"
            items={[...COLLECTION, { href: "/settings", label: "Settings", icon: IconSettings }]}
            pathname={pathname}
            collapsed={false}
            className="mt-6"
          />

          {playlists.length > 0 && (
            <>
              <p className="eyebrow mt-6 mb-2 px-3">Playlists</p>
              <ul className="space-y-0.5">
                {playlists.slice(0, 30).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/playlists/${p.id}`}
                      className="block truncate rounded-[var(--r-sm)] px-3 py-1.5 text-[0.8125rem] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex-1" />

          <Link
            href={user ? "/settings" : "/login"}
            className="mt-3 flex items-center gap-3 rounded-[var(--r-md)] p-2 transition-colors hover:bg-[var(--surface-2)]"
          >
            <Avatar />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-[var(--text)]">
                {user ? user.displayName : "Sign in"}
              </span>
              <span className="block truncate text-[0.6875rem] text-[var(--text-mute)]">
                {user ? "My Library" : "Save your music"}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* =============================== Top header ============================= */

export function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <header
      className="pt-safe sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--bg)]/80 backdrop-blur-xl"
    >
      <div className="flex h-[var(--header-h)] items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] lg:hidden"
        >
          <IconMenu size={22} />
        </button>

        <Link href="/" className="shrink-0 lg:hidden" aria-label="Resonate home">
          <LogoMark size={28} />
        </Link>

        <form onSubmit={submit} className="hidden min-w-0 max-w-md flex-1 sm:block" role="search">
          <SearchField value={query} onChange={setQuery} />
        </form>

        {/* Phone: search is an icon that routes to the search page. */}
        <Link
          href="/search"
          aria-label="Search"
          className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] sm:hidden"
        >
          <IconSearch size={20} />
        </Link>

        <div className="ml-auto hidden shrink-0 items-center gap-3 sm:flex">
          {!user && (
            <>
              <Link
                href="/login"
                className="rounded-[var(--r-sm)] px-2 py-1.5 text-[0.8125rem] font-medium text-[var(--text)] transition-opacity hover:opacity-70"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-[var(--r-sm)] px-2 py-1.5 text-[0.8125rem] font-medium text-[var(--text)] transition-opacity hover:opacity-70"
              >
                Sign Up
              </Link>
            </>
          )}
          <Link
            href="/search"
            className="brand-gradient brighten inline-flex h-9 items-center gap-2 rounded-[var(--r-full)] px-4 text-[0.8125rem] font-bold text-[var(--on-accent)] transition-[filter]"
          >
            <IconUpload size={17} />
            <span className="hidden md:inline">Add music</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--accent)]">
        <IconSearch size={18} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for artists, songs, albums"
        aria-label="Search for artists, songs, albums"
        className="h-10 w-full rounded-[var(--r-full)] bg-[var(--surface-3)] pr-4 pl-11 text-[0.875rem] text-[var(--text)] placeholder:text-[var(--text-mute)] outline-none transition-colors focus:bg-[var(--surface-4)] focus:ring-2 focus:ring-[var(--accent-ring)] [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}

/* ============================== Avatar ================================ */

export function Avatar({ size = 34 }: { size?: number }) {
  const user = useStore((s) => s.user);
  const COLORS: Record<string, string> = {
    ember: "linear-gradient(135deg,#ffbe00,#e85e0a)",
    violet: "linear-gradient(135deg,#a78bfa,#7c3aed)",
    cyan: "linear-gradient(135deg,#67e8f9,#0891b2)",
    rose: "linear-gradient(135deg,#fda4af,#e11d48)",
    lime: "linear-gradient(135deg,#d9f99d,#65a30d)",
    amber: "linear-gradient(135deg,#ffbe00,#e85e0a)",
    slate: "linear-gradient(135deg,#64748b,#94a3b8)",
  };

  if (!user) {
    return (
      <span
        style={{ width: size, height: size }}
        className="grid shrink-0 place-items-center rounded-full bg-[var(--surface-3)] text-[var(--text-mute)]"
      >
        <IconUser size={size * 0.55} />
      </span>
    );
  }

  return (
    <span
      style={{
        width: size,
        height: size,
        background: COLORS[user.avatarColor] ?? COLORS.ember,
        fontSize: size * 0.42,
      }}
      className="grid shrink-0 place-items-center rounded-full font-bold text-[#0a0a0a] select-none"
      aria-hidden="true"
    >
      {user.avatarEmoji || user.displayName.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/* =========================== Mobile bottom nav ========================= */

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border-soft)] bg-[var(--surface)]/95 backdrop-blur-xl lg:hidden"
      style={{ height: `calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))` }}
    >
      <ul className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch">
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-[var(--text)]" : "text-[var(--text-mute)]"
                }`}
              >
                <span className={active ? "brand-text" : ""}>
                  <Icon size={21} />
                </span>
                <span className="text-[0.625rem] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Simple page title bar used by inner pages on mobile (kept for compatibility). */
export function MobileHeader({ title, action }: { title?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 lg:hidden">
      {title && (
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-[var(--text)]">
          {title}
        </h1>
      )}
      {action}
    </div>
  );
}

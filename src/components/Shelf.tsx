"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/Icons";
import { CardSkeleton } from "@/components/ui/primitives";

/**
 * Horizontally scrolling row of cards. Snaps, hides its scrollbar, and shows
 * circular chevron buttons at the edges (desktop) that page the row and hide
 * themselves at each end.
 */
export function Shelf({
  title,
  subtitle,
  href,
  hrefLabel = "View all",
  loading,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  loading?: boolean;
  children?: ReactNode;
  empty?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!loading && !hasChildren && !empty) return null;

  return (
    <section className="group/shelf mt-9 first:mt-2">
      <div className="mb-3.5 flex items-end justify-between gap-3 px-4 lg:px-6">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--text-mute)]">{subtitle}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-[var(--r-sm)] px-1.5 py-1 text-[0.6875rem] font-bold tracking-[0.08em] text-[var(--text-mute)] uppercase transition-colors hover:text-[var(--text)]"
          >
            {hrefLabel}
            <IconChevronRight size={14} />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1 lg:px-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : hasChildren ? (
        <div className="relative">
          {/* Edge chevrons — desktop only, hidden at each end. */}
          <ArrowButton side="left" hidden={atStart} onClick={() => page(-1)} />
          <ArrowButton side="right" hidden={atEnd} onClick={() => page(1)} />
          <div ref={scroller} className="carousel gap-4 px-4 pb-1 lg:px-6">
            {children}
          </div>
        </div>
      ) : (
        <div className="px-4 lg:px-6">{empty}</div>
      )}
    </section>
  );
}

function ArrowButton({
  side,
  hidden,
  onClick,
}: {
  side: "left" | "right";
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      onClick={onClick}
      className={`absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-[60%] place-items-center rounded-full bg-[var(--surface-3)]/90 text-[var(--text)] shadow-[var(--shadow-lg)] backdrop-blur transition-opacity hover:bg-[var(--surface-4)] lg:grid ${
        side === "left" ? "left-3" : "right-3"
      } ${hidden ? "pointer-events-none opacity-0" : "opacity-0 group-hover/shelf:opacity-100"}`}
    >
      {side === "left" ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
    </button>
  );
}

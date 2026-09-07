"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconClose } from "./Icons";
import { IconButton } from "./primitives";

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Handles focus
 * trapping, Escape, scroll locking and swipe-to-dismiss.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const drag = useRef<{ startY: number; active: boolean }>({ startY: 0, active: false });

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusables = panel.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);

    const t = setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
      target?.focus();
    }, 40);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      clearTimeout(t);
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (window.matchMedia("(min-width: 640px)").matches) return;
    drag.current = { startY: e.clientY, active: true };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    setDragY(Math.max(0, e.clientY - drag.current.startY));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragY((y) => {
      if (y > 110) onClose();
      return 0;
    });
  }, [onClose]);

  if (!open) return null;

  const width = size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={`animate-sheet relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] outline-none sm:rounded-[var(--r-lg)] ${width}`}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="shrink-0 touch-none pt-2.5 sm:hidden"
        >
          <div className="mx-auto h-1 w-9 rounded-full bg-[var(--surface-3)]" />
        </div>

        {title && (
          <div className="flex shrink-0 items-start gap-3 px-5 pt-4 pb-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight text-[var(--text)]">{title}</h2>
              {description && (
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
                  {description}
                </p>
              )}
            </div>
            <IconButton label="Close" size={32} onClick={onClose} className="-mr-1.5 shrink-0">
              <IconClose size={18} />
            </IconButton>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">{children}</div>

        {footer && (
          <div className="pb-safe shrink-0 border-t border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3.5">
            {footer}
          </div>
        )}
        {!footer && <div className="pb-safe shrink-0" />}
      </div>
    </div>
  );
}

/** A single tappable row inside a sheet. */
export function SheetItem({
  icon,
  label,
  sublabel,
  onClick,
  href,
  danger,
  trailing,
  disabled,
}: {
  icon?: ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  const inner = (
    <>
      {icon && (
        <span className={`shrink-0 ${danger ? "text-[var(--danger)]" : "text-[var(--text-dim)]"}`}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-[0.9375rem] ${danger ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
          {label}
        </span>
        {sublabel && <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--text-mute)]">{sublabel}</span>}
      </span>
      {trailing}
    </>
  );

  const cls =
    "flex w-full items-center gap-3.5 rounded-[var(--r-sm)] px-3.5 py-3 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:pointer-events-none";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

/** Small confirm dialog used for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  destructive = true,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} description={body} size="sm">
      <div className="flex gap-2.5 px-3.5 pt-2 pb-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface-2)] text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-3)]"
        >
          Cancel
        </button>
        <button
          type="button"
          data-autofocus
          onClick={onConfirm}
          className={`h-11 flex-1 rounded-[var(--r-sm)] text-sm font-semibold text-white transition-[filter] hover:brightness-110 ${
            destructive ? "bg-[var(--danger)]" : "bg-[var(--accent)] text-[var(--on-accent)]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

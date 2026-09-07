"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { IconWarning, IconMusicOff } from "./Icons";

/* ------------------------------- Button ------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "brand-gradient text-[var(--on-accent)] font-bold hover:brightness-110 active:brightness-95",
  secondary: "bg-[var(--surface-3)] text-[var(--text)] hover:bg-[var(--surface-4)]",
  ghost: "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem] gap-1.5 rounded-[var(--r-full)]",
  md: "h-10 px-5 text-sm gap-2 rounded-[var(--r-full)]",
  lg: "h-12 px-7 text-[0.9375rem] gap-2 rounded-[var(--r-full)]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button(
  { variant = "secondary", size = "md", loading, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-[background,color,filter,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner size={15} />}
      {children}
    </button>
  );
});

/** Square icon button with an accessible label. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; size?: number }
>(function IconButton({ label, active, size = 40, className = "", children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      style={{ width: size, height: size }}
      className={`inline-grid place-items-center rounded-full transition-colors duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
        active ? "text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
      } hover:bg-[var(--surface-2)] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ------------------------------- Spinner ------------------------------ */

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin-slow ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.6" opacity="0.2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------- Inputs ------------------------------- */

export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }
>(function TextField({ label, error, hint, className = "", id, ...rest }, ref) {
  const inputId = id ?? rest.name ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--text-dim)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`w-full rounded-[var(--r-sm)] bg-[var(--surface-3)] px-3.5 py-2.5 text-[0.9375rem] text-[var(--text)] placeholder:text-[var(--text-mute)] transition-colors outline-none focus:bg-[var(--surface-4)] focus:ring-2 ${
          error ? "ring-2 ring-[var(--danger)]" : "focus:ring-[var(--accent-ring)]"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-[0.8125rem] text-[var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[0.8125rem] text-[var(--text-mute)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  describedBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? "brand-gradient" : "bg-[var(--surface-4)]"
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "none" }}
      />
    </button>
  );
}

/* ------------------------------ Skeletons ----------------------------- */

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton rounded-[var(--r-md)] ${className}`} style={style} />;
}

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Skeleton className="h-12 w-12 shrink-0 rounded-[var(--r-sm)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-3 w-9" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-[9.5rem] shrink-0 space-y-2.5 sm:w-[11rem]">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

/* ------------------------------- States ------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-[var(--r-lg)] bg-[var(--surface-2)] text-[var(--text-mute)]">
        {icon ?? <IconMusicOff size={26} />}
      </div>
      <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-dim)]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  hint,
  onRetry,
  compact,
}: {
  title: string;
  body?: string;
  hint?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`rounded-[var(--r-lg)] bg-[var(--surface-2)] ${compact ? "p-4" : "p-6"}`}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--danger)]">
          <IconWarning size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
          {body && <p className="mt-1 text-sm leading-relaxed text-[var(--text-dim)]">{body}</p>}
          {hint && <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--text-mute)]">{hint}</p>}
          {onRetry && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Misc -------------------------------- */

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-4 sm:px-0">
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--text-mute)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  as = "button",
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  as?: "button" | "span";
}) {
  const cls = `inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--r-full)] px-4 text-[0.8125rem] font-semibold transition-colors ${
    active
      ? "bg-[var(--text)] text-[#0a0a0a]"
      : "bg-transparent text-[var(--text-dim)] ring-1 ring-inset ring-[var(--surface-4)] hover:text-[var(--text)] hover:ring-[var(--text-mute)]"
  }`;
  if (as === "span") return <span className={cls}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {children}
    </button>
  );
}

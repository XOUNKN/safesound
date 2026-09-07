"use client";

import type { ReactNode } from "react";
import { IconCheck, IconChevronRight } from "@/components/ui/Icons";
import { Toggle } from "@/components/ui/primitives";

export function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-8 first:mt-0">
      <h2 className="px-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--text-mute)] uppercase">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 px-1 text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
          {description}
        </p>
      )}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {children}
      </div>
    </section>
  );
}

export function Row({
  label,
  description,
  children,
  onClick,
  danger,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={`block text-[0.9375rem] ${danger ? "text-[var(--danger)]" : "text-[var(--text)]"}`}
        >
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
            {description}
          </span>
        )}
      </span>
      {children}
      {onClick && !children && (
        <span className="shrink-0 text-[var(--text-mute)]">
          <IconChevronRight size={17} />
        </span>
      )}
    </>
  );

  const cls =
    "flex w-full items-center gap-4 border-b border-[var(--border-soft)] px-4 py-3.5 last:border-b-0";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} transition-colors hover:bg-[var(--surface-2)]`}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Row label={label} description={description}>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </Row>
  );
}

/** Radio-style list where the selected item gets a check. */
export function OptionRows<T extends string | number>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { value: T; label: string; description?: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className="flex w-full items-center gap-4 border-b border-[var(--border-soft)] px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-2)]"
          >
            {o.icon && <span className="shrink-0 text-[var(--text-dim)]">{o.icon}</span>}
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[0.9375rem] ${selected ? "font-medium text-[var(--text)]" : "text-[var(--text)]"}`}
              >
                {o.label}
              </span>
              {o.description && (
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">
                  {o.description}
                </span>
              )}
            </span>
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors ${
                selected
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "border border-[var(--border)]"
              }`}
            >
              {selected && <IconCheck size={13} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Explains a capability the platform genuinely cannot provide. */
export function UnavailableCard({
  title,
  reason,
  instead,
}: {
  title: string;
  reason: string;
  instead?: string;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className="text-[0.9375rem] font-medium text-[var(--text)]">{title}</span>
        <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-[var(--text-mute)] uppercase">
          Unavailable
        </span>
      </div>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--text-dim)]">{reason}</p>
      {instead && (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--text-mute)]">{instead}</p>
      )}
    </div>
  );
}

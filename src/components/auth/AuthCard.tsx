"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="animate-rise">
        <Link href="/" className="mb-7 inline-flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-lg font-semibold tracking-tight text-[var(--text)]">Resonate</span>
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{subtitle}</p>
        )}

        <div className="mt-7">{children}</div>

        {footer && <div className="mt-6 text-sm text-[var(--text-dim)]">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ error }: { error: { message: string; hint?: string } | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3.5 py-3"
    >
      <p className="text-[0.8125rem] font-medium text-[var(--text)]">{error.message}</p>
      {error.hint && <p className="mt-1 text-[0.75rem] text-[var(--text-dim)]">{error.hint}</p>}
    </div>
  );
}

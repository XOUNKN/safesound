"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconWarning } from "@/components/ui/Icons";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--danger)]">
        <IconWarning size={26} />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-[var(--text)]">
        This screen hit an error
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
        Your playlists, favorites and queue are safe — this is a display problem, not a data one.
      </p>
      {error.message && (
        <p className="mt-3 max-w-sm rounded-lg bg-[var(--surface-2)] px-3 py-2 font-mono text-[0.75rem] break-words text-[var(--text-mute)]">
          {error.message}
        </p>
      )}
      <div className="mt-7 flex gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-5 text-sm font-medium text-[var(--text)]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

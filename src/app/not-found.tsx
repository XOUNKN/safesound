import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <LogoMark size={44} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--text)]">
        We can&rsquo;t find that page
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
        The link may be old, or the playlist it pointed at was deleted or made private.
      </p>
      <div className="mt-7 flex gap-2.5">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)]"
        >
          Back to Home
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-5 text-sm font-medium text-[var(--text)]"
        >
          Search music
        </Link>
      </div>
    </div>
  );
}

/**
 * Resonate mark: three concentric arcs radiating from a solid core — a sound
 * wave leaving its source — filled with the warm ember gradient. Original work.
 */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  const id = `rg-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-from)" />
          <stop offset="1" stopColor="var(--accent-to)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <circle cx="14" cy="20" r="3.4" fill="var(--on-accent)" />
      <path d="M20.4 13.6a9 9 0 0 1 0 12.8" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" opacity="0.95" />
      <path d="M25.6 10.4a14.4 14.4 0 0 1 0 19.2" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path d="M30.8 7.6a19.4 19.4 0 0 1 0 24.8" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}

export function Wordmark({ size = 28, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {showText && (
        <span className="text-[1.0625rem] font-bold tracking-tight text-[var(--text)]">Resonate</span>
      )}
    </span>
  );
}

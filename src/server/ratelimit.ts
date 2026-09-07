import { ApiError } from "./http";

const formatWait = (secs: number): string => {
  if (secs < 60) return `${secs} second${secs === 1 ? "" : "s"}`;
  const mins = Math.ceil(secs / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

/** Best-effort client identity for rate limiting (single-instance, in-memory). */
export function clientKey(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return ip;
}

/** Scope-specific guidance so the message actually explains the limit. */
const HINTS: Record<string, string> = {
  search: "This limit protects the shared YouTube API quota.",
  lyrics: "This limit keeps us a considerate client of the lyrics provider.",
  login: "This limit slows down password guessing. It clears on its own.",
  signup: "Only a few accounts can be created from one address per hour.",
  "reset-request": "Only a few reset links can be requested per hour.",
  "reset-confirm": "Only a few reset attempts are allowed per hour.",
  "password-change": "This limit slows down password guessing.",
};

export function rateLimit(req: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const key = `${scope}:${clientKey(req)}`;
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    const secs = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `Too many attempts. Try again in ${formatWait(secs)}.`,
      HINTS[scope],
    );
  }
}

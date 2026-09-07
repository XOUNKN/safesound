"use client";

import { useState } from "react";
import { thumbUrl } from "@/lib/format";
import type { Track } from "@/lib/types";

/**
 * Thumbnails load straight from YouTube's image CDN — never re-hosted or
 * proxied. A blur-up placeholder (the tiny mqdefault) shows immediately and the
 * full image fades in over it. If an image 404s (deleted / region-blocked) we
 * fall back through the smaller sizes and finally to a gradient tile.
 */
export function Artwork({
  track,
  size = "sm",
  className = "",
  rounded = "rounded-[var(--r-sm)]",
}: {
  track: Pick<Track, "videoId" | "thumbnailUrl" | "title">;
  size?: "sm" | "lg";
  className?: string;
  rounded?: string;
}) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const candidates = [
    thumbUrl(track, size),
    `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`,
  ];
  const src = candidates[step];
  // A tiny image behind the real one, blurred, for the blur-up effect.
  const placeholder = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`;

  if (!src) {
    return (
      <div
        className={`grid place-items-center overflow-hidden bg-[var(--surface-3)] ${rounded} ${className}`}
        aria-hidden="true"
      >
        <span className="brand-gradient h-full w-full opacity-40" style={{ filter: "brightness(0.55)" }} />
      </div>
    );
  }

  return (
    <span className={`relative block overflow-hidden bg-[var(--surface-3)] ${rounded} ${className}`}>
      {!loaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="blurup-placeholder absolute inset-0 h-full w-full object-cover"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0")}
        />
      )}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setStep((s) => s + 1);
        }}
        className="blurup-full absolute inset-0 h-full w-full object-cover"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </span>
  );
}

/** 2×2 collage built from the first four covers in a playlist. */
export function CoverCollage({
  covers,
  className = "",
  rounded = "rounded-[var(--r-md)]",
}: {
  covers: string[];
  className?: string;
  rounded?: string;
}) {
  if (!covers.length) {
    return (
      <div className={`grid place-items-center overflow-hidden bg-[var(--surface-2)] ${rounded} ${className}`}>
        <span className="brand-gradient h-full w-full opacity-25" />
      </div>
    );
  }
  if (covers.length < 4) {
    return (
      <img
        src={covers[0]}
        alt=""
        loading="lazy"
        decoding="async"
        className={`bg-[var(--surface-3)] object-cover ${rounded} ${className}`}
      />
    );
  }
  return (
    <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden bg-[var(--surface-3)] ${rounded} ${className}`}>
      {covers.slice(0, 4).map((c, i) => (
        <img key={`${c}-${i}`} src={c} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}

/** Three animated bars marking the row that is currently playing. */
export function PlayingBars({ paused }: { paused?: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
      {[0, 0.2, 0.4].map((d, i) => (
        <span
          key={i}
          className={paused ? "" : "eq-bar"}
          style={{
            animationDelay: `${d}s`,
            width: 2.5,
            height: i === 1 ? 14 : 10,
            borderRadius: 2,
            background: "var(--accent-from)",
            transform: paused ? "scaleY(0.4)" : undefined,
          }}
        />
      ))}
    </span>
  );
}

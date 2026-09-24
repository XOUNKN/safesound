import { ImageResponse } from "next/og";
import { formatTotalDuration, pluralize } from "@/lib/format";
import { BRAND, MARK_DATA_URI } from "@/server/brand";
import { getSharedPlaylist } from "@/server/repo";

export const alt = "A playlist shared on Resonate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Covers are YouTube thumbnail URLs (validated against an allowlist on write).
 * Fetch them up front with a timeout so one slow thumbnail can't fail the whole
 * card; anything that doesn't arrive in time is simply left out.
 */
const THUMB_HOST = /^https:\/\/(i\.ytimg\.com|img\.youtube\.com|yt3\.ggpht\.com)\//;

async function inlineCovers(urls: string[]): Promise<string[]> {
  const results = await Promise.all(
    urls.slice(0, 4).map(async (url) => {
      if (!THUMB_HOST.test(url)) return null;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
        if (!res.ok) return null;
        const type = res.headers.get("content-type") ?? "image/jpeg";
        const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
        return `data:${type};base64,${b64}`;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((x): x is string => Boolean(x));
}

export default async function SharedPlaylistImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const playlist = getSharedPlaylist(token);
  const covers = playlist ? await inlineCovers(playlist.covers) : [];

  const tile = 460;
  const half = tile / 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: 72,
          background: BRAND.bg,
          backgroundImage: `radial-gradient(60% 80% at 100% 0%, ${BRAND.to}44, transparent 70%)`,
          color: BRAND.text,
        }}
      >
        {/* Cover: a 2×2 collage, one big cover, or the brand gradient. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: tile,
            height: tile,
            flexShrink: 0,
            borderRadius: 28,
            overflow: "hidden",
            backgroundImage: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
          }}
        >
          {covers.length >= 4
            ? covers.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} width={half} height={half} alt="" style={{ objectFit: "cover" }} />
              ))
            : covers[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={covers[0]} width={tile} height={tile} alt="" style={{ objectFit: "cover" }} />
              )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, color: BRAND.textDim, letterSpacing: 3, textTransform: "uppercase" }}>
            Playlist
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: playlist && playlist.name.length > 28 ? 56 : 72,
              lineHeight: 1.05,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            {playlist?.name ?? "Shared playlist"}
          </div>
          {playlist && (
            <div style={{ marginTop: 20, fontSize: 30, color: BRAND.textDim, display: "flex" }}>
              {`by ${playlist.ownerName} · ${pluralize(playlist.trackCount, "song")} · ${formatTotalDuration(playlist.durationSec)}`}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 56 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK_DATA_URI} width={52} height={52} alt="" />
            <div style={{ fontSize: 32 }}>{BRAND.name}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

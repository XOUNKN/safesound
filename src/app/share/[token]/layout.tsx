import type { Metadata } from "next";
import { formatTotalDuration, pluralize } from "@/lib/format";
import { getSharedPlaylist } from "@/server/repo";

type Props = { params: Promise<{ token: string }> };

/**
 * The page itself is a client component, so this server layout is what gives
 * a pasted share link its real title and description instead of the generic
 * site card.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const playlist = getSharedPlaylist(token);
  // Unlisted means "anyone with the link", not "anyone searching".
  const robots = { index: false, follow: false };
  if (!playlist) return { title: "Shared playlist", robots };

  const title = `${playlist.name}, a playlist by ${playlist.ownerName}`;
  const description = `${pluralize(playlist.trackCount, "song")} · ${formatTotalDuration(
    playlist.durationSec,
  )}. Press play on Resonate, free and no account needed.`;

  return {
    title: playlist.name,
    description,
    robots,
    openGraph: { title, description, siteName: "Resonate", type: "music.playlist" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function SharedPlaylistLayout({ children }: { children: React.ReactNode }) {
  return children;
}

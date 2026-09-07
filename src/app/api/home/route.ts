import { ApiError, json, route } from "@/server/http";
import { currentUser } from "@/server/session";
import { listFavorites, listHistory, listPlaylists, topChannels } from "@/server/repo";
import { isConfigured, refreshStaleTracks, search, trending } from "@/server/youtube";
import type { ApiErrorCode, Playlist, Track } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Shelf<T> = { items: T[] } | { error: { code: ApiErrorCode; message: string; hint?: string } };

async function shelf<T>(load: () => Promise<T[]>): Promise<Shelf<T>> {
  try {
    return { items: await load() };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: { code: err.code, message: err.message, hint: err.hint } };
    }
    return {
      error: { code: "INTERNAL", message: "This section couldn't load right now." },
    };
  }
}

/**
 * One request powers the whole Home screen. Each shelf fails independently so
 * a YouTube quota error never blanks the user's own library.
 */
export const GET = route(async () => {
  const user = await currentUser();
  const youtubeConfigured = isConfigured();

  if (!user) {
    return json({
      signedIn: false,
      youtubeConfigured,
      trending: youtubeConfigured
        ? await shelf<Track>(() => trending())
        : { items: [] as Track[] },
    });
  }

  const recent = listHistory(user.id, 20);
  const favorites = listFavorites(user.id, "recent");
  const playlists: Playlist[] = listPlaylists(user.id, "recent");

  // Keep cached metadata inside the provider's 30-day storage window.
  void refreshStaleTracks([
    ...recent.slice(0, 30).map((t) => t.videoId),
    ...favorites.slice(0, 30).map((t) => t.videoId),
  ]);

  const channels = topChannels(user.id, 2);

  const [trendingShelf, discoverShelf] = await Promise.all([
    youtubeConfigured ? shelf<Track>(() => trending()) : Promise.resolve({ items: [] as Track[] }),
    youtubeConfigured && channels.length
      ? shelf<Track>(async () => {
          const seen = new Set(recent.map((t) => t.videoId));
          const out: Track[] = [];
          for (const c of channels) {
            const res = await search(c.channelTitle, undefined, true);
            for (const t of res.items) {
              if (!seen.has(t.videoId)) {
                seen.add(t.videoId);
                out.push(t);
              }
            }
          }
          return out.slice(0, 20);
        })
      : Promise.resolve({ items: [] as Track[] }),
  ]);

  return json({
    signedIn: true,
    youtubeConfigured,
    recentlyPlayed: recent,
    favorites: favorites.slice(0, 20),
    playlists,
    trending: trendingShelf,
    discover: discoverShelf,
    // The label the UI shows above the Discover shelf. We only claim it is
    // based on listening when there is real history behind it.
    discoverBasis: channels.length
      ? channels.map((c) => c.channelTitle)
      : [],
  });
});

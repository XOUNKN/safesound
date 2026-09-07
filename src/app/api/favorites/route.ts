import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { favoriteIds, listFavorites, setFavorite, type LibrarySort } from "@/server/repo";
import { favoriteSchema, parseBody } from "@/server/validation";
import { refreshStaleTracks } from "@/server/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS: LibrarySort[] = ["recent", "alpha", "played"];

export const GET = route(async (req) => {
  const user = await requireUser();
  const raw = new URL(req.url).searchParams.get("sort") as LibrarySort | null;
  const sort = raw && SORTS.includes(raw) ? raw : "recent";
  const tracks = listFavorites(user.id, sort);
  void refreshStaleTracks(tracks.map((t) => t.videoId));
  return json({ tracks });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const { track, favorite } = await parseBody(req, favoriteSchema);
  setFavorite(user.id, track, favorite);
  return json({ favorite, favoriteIds: favoriteIds(user.id) });
});

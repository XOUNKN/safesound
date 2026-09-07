import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { addTracksToPlaylist, createPlaylist, listPlaylists, type PlaylistSort } from "@/server/repo";
import { parseBody, playlistCreateSchema } from "@/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS: PlaylistSort[] = ["recent", "alpha", "created", "size"];

export const GET = route(async (req) => {
  const user = await requireUser();
  const raw = new URL(req.url).searchParams.get("sort") as PlaylistSort | null;
  const sort = raw && SORTS.includes(raw) ? raw : "recent";
  return json({ playlists: listPlaylists(user.id, sort) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, playlistCreateSchema);
  const playlist = createPlaylist(user.id, body.name, body.description);
  if (body.tracks?.length) {
    addTracksToPlaylist(user.id, playlist.id, body.tracks);
  }
  return json({ playlist: listPlaylists(user.id).find((p) => p.id === playlist.id) ?? playlist }, { status: 201 });
});

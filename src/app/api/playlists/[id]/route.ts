import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { deletePlaylist, getPlaylistDetail, updatePlaylist } from "@/server/repo";
import { parseBody, playlistPatchSchema } from "@/server/validation";
import { refreshStaleTracks } from "@/server/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const detail = getPlaylistDetail(user.id, id);
  void refreshStaleTracks(detail.tracks.map((t) => t.videoId));
  return json({ playlist: detail });
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const patch = await parseBody(req, playlistPatchSchema);
  return json({ playlist: updatePlaylist(user.id, id, patch) });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  deletePlaylist(user.id, id);
  return json({ ok: true });
});

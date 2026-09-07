import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { addTracksToPlaylist, getPlaylistDetail } from "@/server/repo";
import { addTracksSchema, parseBody } from "@/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { tracks } = await parseBody(req, addTracksSchema);
  const result = addTracksToPlaylist(user.id, id, tracks);
  return json({ ...result, playlist: getPlaylistDetail(user.id, id) });
});

import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getPlaylistDetail, removeTrackFromPlaylist } from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; entryId: string }> };

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id, entryId } = await ctx.params;
  removeTrackFromPlaylist(user.id, id, entryId);
  return json({ playlist: getPlaylistDetail(user.id, id) });
});

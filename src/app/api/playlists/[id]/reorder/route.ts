import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getPlaylistDetail, reorderPlaylist } from "@/server/repo";
import { parseBody, reorderSchema } from "@/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { entryIds } = await parseBody(req, reorderSchema);
  reorderPlaylist(user.id, id, entryIds);
  return json({ playlist: getPlaylistDetail(user.id, id) });
});

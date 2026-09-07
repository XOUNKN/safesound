import { json, notFound, route } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { getSharedPlaylist } from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/**
 * Public, read-only view of an *unlisted* playlist. Private playlists are
 * never reachable here: the query itself filters on visibility, so flipping a
 * playlist back to private instantly kills every shared link.
 */
export const GET = route(async (req: Request, ctx: Ctx) => {
  rateLimit(req, "shared", 60, 60_000);
  const { token } = await ctx.params;
  const playlist = getSharedPlaylist(token);
  if (!playlist) {
    throw notFound(
      "This shared playlist isn't available.",
    );
  }
  return json({ playlist });
});

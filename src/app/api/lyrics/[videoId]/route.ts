import { getDb } from "@/server/db";
import { json, notFound, route } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { requireUser } from "@/server/session";
import { getLyrics } from "@/server/lyrics";
import { videoId as videoIdSchema } from "@/server/validation";
import { badRequest } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ videoId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  await requireUser();
  rateLimit(req, "lyrics", 30, 60_000);

  const { videoId } = await ctx.params;
  const parsed = videoIdSchema.safeParse(videoId);
  if (!parsed.success) throw badRequest("That isn't a valid video id.");

  // We look the title up from our own metadata table rather than trusting the
  // client, so lyrics can't be probed with arbitrary strings.
  const row = getDb()
    .prepare("SELECT title, channel_title, duration_sec FROM tracks WHERE video_id = ?")
    .get(parsed.data) as
    | { title: string; channel_title: string; duration_sec: number }
    | undefined;
  if (!row) {
    throw notFound("We don't have metadata for that track yet.", );
  }

  const lyrics = await getLyrics(parsed.data, row.title, row.channel_title, row.duration_sec);
  return json({ lyrics });
});

import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { loadQueue, saveQueue } from "@/server/repo";
import { parseBody, queueSaveSchema } from "@/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ queue: loadQueue(user.id) });
});

/** Full replacement of the persisted queue. The client debounces these. */
export const PUT = route(async (req) => {
  const user = await requireUser();
  const { tracks, currentIndex, context } = await parseBody(req, queueSaveSchema);
  saveQueue(user.id, tracks, currentIndex, context);
  return json({ ok: true, size: Math.min(tracks.length, 500) });
});

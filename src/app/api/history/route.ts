import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { clearHistory, getSettings, listHistory, recordPlayback } from "@/server/repo";
import { historySchema, parseBody } from "@/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ tracks: listHistory(user.id, 200) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const { track, source } = await parseBody(req, historySchema);
  if (!getSettings(user.id).saveHistory) {
    return json({ recorded: false, reason: "History saving is turned off in Settings → Privacy." });
  }
  recordPlayback(user.id, track, source);
  return json({ recorded: true });
});

export const DELETE = route(async () => {
  const user = await requireUser();
  clearHistory(user.id);
  return json({ tracks: [] });
});

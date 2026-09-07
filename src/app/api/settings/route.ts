import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getSettings, saveSettings } from "@/server/repo";
import { parseBody, settingsSchema } from "@/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ settings: getSettings(user.id) });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const patch = await parseBody(req, settingsSchema);
  return json({ settings: saveSettings(user.id, patch) });
});

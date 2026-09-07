import { destroySession } from "@/server/auth";
import { json, route } from "@/server/http";
import { clearSessionCookie, readSessionToken } from "@/server/session";

export const runtime = "nodejs";

export const POST = route(async () => {
  const token = await readSessionToken();
  if (token) destroySession(token);
  await clearSessionCookie();
  return json({ ok: true });
});

import { json, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { clearSearches, listSearches } from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ searches: listSearches(user.id) });
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const q = new URL(req.url).searchParams.get("q");
  clearSearches(user.id, q ?? undefined);
  return json({ searches: listSearches(user.id) });
});

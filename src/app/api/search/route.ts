import { json, route, badRequest } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { currentUser } from "@/server/session";
import { getSettings, recordSearch } from "@/server/repo";
import { search } from "@/server/youtube";
import type { SearchPage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  // Search is the only quota-consuming path, so it carries the tightest limit.
  rateLimit(req, "search", 40, 60_000);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const pageToken = url.searchParams.get("pageToken") ?? undefined;
  const musicOnly = url.searchParams.get("all") !== "1";

  if (!q) throw badRequest("Type something to search for.");
  if (q.length > 120) throw badRequest("That search is too long.", "Keep it under 120 characters.");

  const result = await search(q, pageToken, musicOnly);

  // Only record the first page of a query, and only if the user opted in.
  const user = await currentUser();
  if (user && !pageToken) {
    const settings = getSettings(user.id);
    if (settings.saveSearchHistory) recordSearch(user.id, q);
  }

  const body: SearchPage = {
    items: result.items,
    nextPageToken: result.nextPageToken,
    source: result.cached ? "cache" : "youtube",
  };
  return json(body);
});

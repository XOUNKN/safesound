import { getDb } from "@/server/db";
import {
  createSession,
  destroyAllSessions,
  hashPassword,
  toPublicUser,
  verifyPassword,
} from "@/server/auth";
import { ApiError, conflict, json, route } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { currentUser, requireUser, setSessionCookie } from "@/server/session";
import { parseBody, passwordChangeSchema, profileSchema } from "@/server/validation";
import { favoriteIds, getSettings, loadQueue } from "@/server/repo";
import { isConfigured } from "@/server/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single bootstrap call. The client hydrates its whole store from this so the
 * first paint already knows the user, their settings, their favorites and the
 * queue they left behind.
 */
export const GET = route(async () => {
  const user = await currentUser();
  if (!user) {
    return json({ user: null, youtubeConfigured: isConfigured() });
  }
  return json({
    user,
    settings: getSettings(user.id),
    favoriteIds: favoriteIds(user.id),
    queue: loadQueue(user.id),
    youtubeConfigured: isConfigured(),
  });
});

/** Update profile fields. */
export const PATCH = route(async (req) => {
  const user = await requireUser();
  const patch = await parseBody(req, profileSchema);
  const db = getDb();

  if (patch.username && patch.username !== user.username) {
    const taken = db
      .prepare("SELECT 1 AS x FROM users WHERE username = ? AND id != ?")
      .get(patch.username, user.id);
    if (taken) throw conflict("That username is taken.", "Pick another one.");
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.displayName !== undefined) (fields.push("display_name = ?"), values.push(patch.displayName));
  if (patch.username !== undefined) (fields.push("username = ?"), values.push(patch.username));
  if (patch.avatarColor !== undefined) (fields.push("avatar_color = ?"), values.push(patch.avatarColor));
  if (patch.avatarEmoji !== undefined) (fields.push("avatar_emoji = ?"), values.push(patch.avatarEmoji));
  if (!fields.length) throw new ApiError(400, "VALIDATION", "Nothing to update.");

  fields.push("updated_at = ?");
  values.push(Date.now(), user.id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const row = db
    .prepare(
      "SELECT id, email, username, display_name, avatar_color, avatar_emoji, created_at FROM users WHERE id = ?",
    )
    .get(user.id) as Parameters<typeof toPublicUser>[0];
  return json({ user: toPublicUser(row) });
});

/** Change password. Signs every other device out, then re-issues this one. */
export const PUT = route(async (req) => {
  const user = await requireUser();
  rateLimit(req, "password-change", 10, 60 * 60 * 1000);
  const { currentPassword, newPassword } = await parseBody(req, passwordChangeSchema);

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as {
    password_hash: string;
  };
  if (!verifyPassword(currentPassword, row.password_hash)) {
    throw new ApiError(401, "UNAUTHORIZED", "Your current password isn't right.");
  }

  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
    hashPassword(newPassword),
    Date.now(),
    user.id,
  );
  destroyAllSessions(user.id);
  await setSessionCookie(createSession(user.id, req.headers.get("user-agent")));
  return json({ ok: true, message: "Password changed. Other devices have been signed out." });
});

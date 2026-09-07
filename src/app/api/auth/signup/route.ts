import { getDb } from "@/server/db";
import { createSession, hashPassword, newId, toPublicUser } from "@/server/auth";
import { conflict, json, route } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { setSessionCookie } from "@/server/session";
import { parseBody, signupSchema } from "@/server/validation";
import { DEFAULT_SETTINGS, saveSettings } from "@/server/repo";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  rateLimit(req, "signup", 5, 60 * 60 * 1000);
  const { email, username, displayName, password } = await parseBody(req, signupSchema);

  const db = getDb();
  const existing = db
    .prepare("SELECT email, username FROM users WHERE email = ? OR username = ?")
    .get(email, username) as { email: string; username: string } | undefined;
  if (existing) {
    throw existing.email === email
      ? conflict("An account already uses that email address.", "Try signing in instead.")
      : conflict("That username is taken.", "Pick another one.");
  }

  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, email, username, display_name, avatar_color, avatar_emoji, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'violet', '', ?, ?, ?)`,
  ).run(id, email, username, displayName, hashPassword(password), now, now);

  saveSettings(id, DEFAULT_SETTINGS);

  const token = createSession(id, req.headers.get("user-agent"));
  await setSessionCookie(token);

  const row = db
    .prepare(
      "SELECT id, email, username, display_name, avatar_color, avatar_emoji, created_at FROM users WHERE id = ?",
    )
    .get(id) as Parameters<typeof toPublicUser>[0];
  return json({ user: toPublicUser(row) }, { status: 201 });
});

import { getDb } from "@/server/db";
import { createSession, dummyVerify, toPublicUser, verifyPassword } from "@/server/auth";
import { ApiError, json, route } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { setSessionCookie } from "@/server/session";
import { loginSchema, parseBody } from "@/server/validation";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  rateLimit(req, "login", 10, 15 * 60 * 1000);
  const { email, password } = await parseBody(req, loginSchema);

  const row = getDb()
    .prepare(
      `SELECT id, email, username, display_name, avatar_color, avatar_emoji, created_at, password_hash
         FROM users WHERE email = ?`,
    )
    .get(email) as
    | (Parameters<typeof toPublicUser>[0] & { password_hash: string })
    | undefined;

  // Same error and comparable timing whether or not the account exists.
  if (!row) {
    dummyVerify(password);
    throw new ApiError(401, "UNAUTHORIZED", "That email and password don't match.");
  }
  if (!verifyPassword(password, row.password_hash)) {
    throw new ApiError(401, "UNAUTHORIZED", "That email and password don't match.");
  }

  const token = createSession(row.id, req.headers.get("user-agent"));
  await setSessionCookie(token);
  return json({ user: toPublicUser(row) });
});

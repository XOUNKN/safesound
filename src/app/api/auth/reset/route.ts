import { getDb } from "@/server/db";
import {
  destroyAllSessions,
  digest,
  hashPassword,
  newId,
  newToken,
} from "@/server/auth";
import { ApiError, json, route } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { parseBody, resetConfirmSchema, resetRequestSchema } from "@/server/validation";

export const runtime = "nodejs";

const TTL = 60 * 60 * 1000; // 1 hour

/**
 * Step 1 — request a reset link.
 *
 * This deployment has no outbound mail transport configured. Rather than
 * pretending an email was sent, the link is written to the server log so an
 * operator can hand it over, and (in development only) returned inline so the
 * flow is testable. It is never returned in production, because that would
 * let anyone reset any account they can name.
 */
export const POST = route(async (req) => {
  rateLimit(req, "reset-request", 5, 60 * 60 * 1000);
  const { email } = await parseBody(req, resetRequestSchema);

  const user = getDb().prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: string }
    | undefined;

  let devLink: string | undefined;
  if (user) {
    const token = newToken();
    const now = Date.now();
    getDb()
      .prepare(
        "INSERT INTO password_resets (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(newId(), user.id, digest(token), now, now + TTL);
    const origin = new URL(req.url).origin;
    const link = `${origin}/reset?token=${token}`;
    console.info(`[password-reset] ${email} -> ${link} (valid 1 hour)`);
    if (process.env.NODE_ENV !== "production") devLink = link;
  }

  // Identical response either way: no account enumeration.
  return json({
    ok: true,
    delivery: "server-log",
    message:
      "If that email has an account, a reset link has been generated. This server has no mail transport configured, so the link was written to the server log.",
    devLink,
  });
});

/** Step 2 — redeem the token. */
export const PUT = route(async (req) => {
  rateLimit(req, "reset-confirm", 10, 60 * 60 * 1000);
  const { token, password } = await parseBody(req, resetConfirmSchema);

  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?",
    )
    .get(digest(token)) as
    | { id: string; user_id: string; expires_at: number; used_at: number | null }
    | undefined;

  if (!row || row.used_at || row.expires_at < Date.now()) {
    throw new ApiError(
      400,
      "VALIDATION",
      "That reset link is no longer valid.",
      "Links expire after one hour and can only be used once. Request a new one.",
    );
  }

  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
    hashPassword(password),
    Date.now(),
    row.user_id,
  );
  db.prepare("UPDATE password_resets SET used_at = ? WHERE id = ?").run(Date.now(), row.id);
  // Any session opened with the old password is now void.
  destroyAllSessions(row.user_id);

  return json({ ok: true });
});

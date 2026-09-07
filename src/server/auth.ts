import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db";
import type { PublicUser } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Secrets
 * ------------------------------------------------------------------ */

let _secret: Buffer | null = null;

/**
 * Server-side pepper used to derive session/reset token digests. Set
 * AUTH_SECRET in production; in development we persist a random one so
 * sessions survive restarts without shipping a hardcoded default.
 */
function secret(): Buffer {
  if (_secret) return _secret;
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv) {
    _secret = Buffer.from(fromEnv, "utf8");
    return _secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET must be set in production. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }
  const file = path.join(process.cwd(), "data", ".dev-auth-secret");
  try {
    _secret = Buffer.from(fs.readFileSync(file, "utf8").trim(), "utf8");
  } catch {
    const generated = crypto.randomBytes(48).toString("base64url");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, generated, { mode: 0o600 });
    _secret = Buffer.from(generated, "utf8");
  }
  return _secret;
}

export const digest = (token: string): string =>
  crypto.createHmac("sha256", secret()).update(token).digest("hex");

export const newToken = (): string => crypto.randomBytes(32).toString("base64url");
export const newId = (): string => crypto.randomUUID();

/* ------------------------------------------------------------------ *
 * Password hashing — scrypt (memory-hard KDF, Node built-in)
 * ------------------------------------------------------------------ */

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64 } as const;

/** Plaintext passwords are never stored — only this encoded scrypt digest. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 256 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? "", "base64");
  const expected = Buffer.from(parts[5] ?? "", "base64");
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !expected.length) {
    return false;
  }
  const actual = crypto.scryptSync(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
    maxmem: 256 * 1024 * 1024,
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/**
 * Burns roughly the same CPU as a real verification. Called when an email
 * doesn't exist so login timing can't be used to enumerate accounts.
 */
export function dummyVerify(password: string): void {
  crypto.scryptSync(password.normalize("NFKC"), crypto.randomBytes(16), SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 256 * 1024 * 1024,
  });
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

export const SESSION_COOKIE = "resonate_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createSession(userId: string, userAgent: string | null): string {
  const token = newToken();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(newId(), userId, digest(token), now, now + SESSION_TTL_MS, userAgent?.slice(0, 300) ?? null);
  return token;
}

type UserRow = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_emoji: string;
  created_at: number;
};

export function toPublicUser(r: UserRow): PublicUser {
  return {
    id: r.id,
    email: r.email,
    username: r.username,
    displayName: r.display_name,
    avatarColor: r.avatar_color,
    avatarEmoji: r.avatar_emoji,
    createdAt: r.created_at,
  };
}

export function userForSessionToken(token: string): PublicUser | null {
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.username, u.display_name, u.avatar_color, u.avatar_emoji, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(digest(token), Date.now()) as UserRow | undefined;
  return row ? toPublicUser(row) : null;
}

export function destroySession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
}

export function destroyAllSessions(userId: string): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

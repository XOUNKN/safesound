import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_MS, userForSessionToken } from "./auth";
import { unauthorized } from "./http";
import type { PublicUser } from "@/lib/types";

export async function currentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return userForSessionToken(token);
  } catch {
    return null;
  }
}

/** Throws a 401 ApiError unless a valid session is present. */
export async function requireUser(): Promise<PublicUser> {
  const user = await currentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

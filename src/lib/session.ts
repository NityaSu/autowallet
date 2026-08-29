import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  readSessionFromToken,
  signSession,
  type SessionUser,
} from "@/lib/session-token";

export { SESSION_COOKIE, signSession } from "@/lib/session-token";
export type { SessionUser } from "@/lib/session-token";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionFromToken(store.get(SESSION_COOKIE)?.value);
}

export async function jsonWithSession(
  user: SessionUser,
  body: Record<string, unknown> = { ok: true },
) {
  const token = await signSession(user);
  const res = NextResponse.json(body);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

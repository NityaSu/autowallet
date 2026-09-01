import { SignJWT, jwtVerify } from "jose";
import { authSecretKey } from "@/lib/auth-config";

export const SESSION_COOKIE = "aw_session";

export type SessionUser = {
  id: string;
  handle: string;
  name: string;
};

export async function signSession(user: SessionUser) {
  return new SignJWT({ handle: user.handle, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecretKey());
}

export async function readSessionFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecretKey());
    const id = payload.sub;
    const handle = payload.handle;
    const name = payload.name;
    if (!id || typeof handle !== "string" || typeof name !== "string") {
      return null;
    }
    return { id, handle, name } satisfies SessionUser;
  } catch {
    return null;
  }
}

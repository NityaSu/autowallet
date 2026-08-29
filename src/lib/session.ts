import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  readSessionFromToken,
  type SessionUser,
} from "@/lib/session-token";

export { SESSION_COOKIE, signSession } from "@/lib/session-token";
export type { SessionUser } from "@/lib/session-token";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionFromToken(store.get(SESSION_COOKIE)?.value);
}

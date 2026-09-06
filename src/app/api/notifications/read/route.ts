import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/pg-notifications";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    await ensureDb();
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      all?: boolean;
    };
    if (body.all || !body.id?.trim()) {
      const result = await markAllNotificationsRead(session.id);
      return NextResponse.json(result);
    }
    const result = await markNotificationRead(session.id, body.id.trim());
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: "Notification not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { listNotificationsForUser } from "@/lib/pg-notifications";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    await ensureDb();
    const inbox = await listNotificationsForUser(session.id);
    return NextResponse.json({ ok: true, ...inbox });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

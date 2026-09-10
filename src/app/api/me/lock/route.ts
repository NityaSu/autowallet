import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { setPersonLocked } from "@/lib/pg-ledger";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const body = (await req.json()) as { locked?: boolean };
    if (typeof body.locked !== "boolean") {
      return NextResponse.json(
        { ok: false, reason: "Say whether to lock or unlock." },
        { status: 400 },
      );
    }
    const result = await setPersonLocked(session.id, body.locked);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

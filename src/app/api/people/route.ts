import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { lookupPerson } from "@/lib/pg-ledger";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const handle = new URL(req.url).searchParams.get("handle") ?? "";
    const result = await lookupPerson(handle, { excludeUserId: session.id });
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

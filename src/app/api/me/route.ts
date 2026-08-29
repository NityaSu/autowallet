import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { centsToUsd } from "@/lib/cents";
import { findUserById, listPeople, listTransfersForUser } from "@/lib/pg-ledger";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const me = await findUserById(session.id);
    if (!me) {
      return NextResponse.json({ ok: false, reason: "User missing" }, { status: 401 });
    }
    const people = await listPeople();
    const transfers = await listTransfersForUser(me.id);
    return NextResponse.json({
      ok: true,
      you: {
        id: me.id,
        name: me.name,
        handle: me.handle,
        balanceUsd: centsToUsd(me.balanceCents),
      },
      people,
      transfers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

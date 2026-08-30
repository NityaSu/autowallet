import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { findTransferForUser } from "@/lib/pg-ledger";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return NextResponse.json(
      { ok: false, reason: "Transfer not found." },
      { status: 404 },
    );
  }
  try {
    await ensureDb();
    const transfer = await findTransferForUser(id, session.id);
    if (!transfer) {
      return NextResponse.json(
        { ok: false, reason: "Transfer not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, transfer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

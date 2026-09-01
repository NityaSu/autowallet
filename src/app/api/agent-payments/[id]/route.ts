import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { findAgentPaymentForOwner } from "@/lib/pg-agents";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { ok: false, reason: "Payment not found." },
      { status: 404 },
    );
  }
  try {
    await ensureDb();
    const payment = await findAgentPaymentForOwner(id, session.id);
    if (!payment) {
      return NextResponse.json(
        { ok: false, reason: "Payment not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { executeTransfer, findUserById, listTransfersForUser } from "@/lib/pg-ledger";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const transfers = await listTransfersForUser(session.id);
    return NextResponse.json({ ok: true, transfers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const me = await findUserById(session.id);
    if (!me) {
      return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
    }
    const body = (await req.json()) as {
      toHandle?: string;
      amount?: number;
      memo?: string;
      idempotencyKey?: string;
    };
    const result = await executeTransfer({
      fromHandle: me.handle,
      toHandle: body.toHandle ?? "",
      amountUsd: Number(body.amount),
      memo: body.memo ?? "",
      idempotencyKey: body.idempotencyKey ?? "",
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import {
  createPaymentRequest,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/pg-requests";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const [incoming, outgoing] = await Promise.all([
      listIncomingRequests(session.id),
      listOutgoingRequests(session.id),
    ]);
    return NextResponse.json({ ok: true, incoming, outgoing });
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
    const body = (await req.json()) as {
      toHandle?: string;
      amount?: number;
      memo?: string;
    };
    const result = await createPaymentRequest(session.id, {
      toHandle: body.toHandle ?? "",
      amountUsd: Number(body.amount),
      memo: body.memo,
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

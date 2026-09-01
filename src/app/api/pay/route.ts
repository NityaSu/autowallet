import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { attemptAgentPay } from "@/lib/pg-agents";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const body = (await req.json()) as {
      agentId?: string;
      apiId?: string;
      idempotencyKey?: string;
    };
    const result = await attemptAgentPay(session.id, body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 402 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

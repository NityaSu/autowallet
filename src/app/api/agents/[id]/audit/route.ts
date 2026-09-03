import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { listAgentAudit } from "@/lib/pg-agents";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    await ensureDb();
    const { id } = await params;
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? "1") || 1;
    const limit = Number(url.searchParams.get("limit") ?? "20") || 20;
    const result = await listAgentAudit(session.id, id, { from, to }, { page, limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json(
      { ok: false, reason: message },
      { status: 503 },
    );
  }
}

import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { listAgentAuditAll, toAgentAuditCsv } from "@/lib/pg-agents";
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
    const payments = await listAgentAuditAll(session.id, id, { from, to });
    const csv = toAgentAuditCsv(payments);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-${id}-audit.csv"`,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json(
      { ok: false, reason: message },
      { status: 503 },
    );
  }
}

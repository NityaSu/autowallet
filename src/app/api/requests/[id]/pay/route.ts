import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { payPaymentRequest } from "@/lib/pg-requests";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const { id } = await params;
    const result = await payPaymentRequest(session.id, id);
    if (!result.ok) {
      const status = result.reason === "Request not found." ? 404 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

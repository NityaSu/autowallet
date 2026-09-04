import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { deleteWebhookEndpoint } from "@/lib/pg-webhooks";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
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
    const result = await deleteWebhookEndpoint(session.id, id);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

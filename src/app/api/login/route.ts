import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDb } from "@/db";
import { findUserByHandle } from "@/lib/pg-ledger";
import { jsonWithSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureDb();
    const body = (await req.json()) as { handle?: string; password?: string };
    const handle = body.handle?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const user = await findUserByHandle(handle);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, reason: "Wrong handle or password." },
        { status: 401 },
      );
    }
    return jsonWithSession({
      id: user.id,
      handle: user.handle,
      name: user.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

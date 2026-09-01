import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { createUser } from "@/lib/pg-ledger";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonWithSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, reason: "Too many signups from this network." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  try {
    await ensureDb();
    const body = (await req.json()) as {
      name?: string;
      handle?: string;
      password?: string;
    };
    const result = await createUser(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return jsonWithSession({
      id: result.user.id,
      handle: result.user.handle,
      name: result.user.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

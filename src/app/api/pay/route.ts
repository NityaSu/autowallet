import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { findAgentKeyAuth, parseBearerToken } from "@/lib/pg-agent-keys";
import { attemptAgentPay } from "@/lib/pg-agents";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureDb();
    const bearer = parseBearerToken(req.headers.get("authorization"));
    let ownerUserId = "";
    let agentFromKey: string | undefined;

    if (bearer) {
      const key = await findAgentKeyAuth(bearer);
      if (!key) {
        return NextResponse.json(
          { ok: false, reason: "Unauthorized" },
          { status: 401 },
        );
      }
      ownerUserId = key.ownerUserId;
      agentFromKey = key.agentUserId;
    } else {
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          { ok: false, reason: "Unauthorized" },
          { status: 401 },
        );
      }
      ownerUserId = session.id;
    }

    const body = (await req.json()) as {
      agentId?: string;
      apiId?: string;
      idempotencyKey?: string;
    };
    if (agentFromKey) {
      if (body.agentId && body.agentId !== agentFromKey) {
        return NextResponse.json(
          { ok: false, reason: "Key is not for that agent." },
          { status: 403 },
        );
      }
      body.agentId = agentFromKey;
    }

    const result = await attemptAgentPay(ownerUserId, body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 402 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

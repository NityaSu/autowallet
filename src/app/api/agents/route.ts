import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { issueAgent, listAgentsForOwner, toggleAgentStatus, updateAgentPolicy } from "@/lib/pg-agents";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const agents = await listAgentsForOwner(session.id);
    return NextResponse.json({ ok: true, agents });
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
      name?: string;
      prefix?: string;
      dailyCapUsd?: number;
      perRequestMaxUsd?: number;
    };
    const result = await issueAgent(session.id, body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureDb();
    const body = (await req.json()) as {
      agentId?: string;
      action?: "toggle";
      dailyCapUsd?: number;
      perRequestMaxUsd?: number;
      allowlist?: string[];
      addHost?: string;
      dropHost?: string;
    };
    const agentId = body.agentId?.trim() ?? "";
    if (!agentId) {
      return NextResponse.json({ ok: false, reason: "Missing agent." }, { status: 400 });
    }
    if (body.action === "toggle") {
      const result = await toggleAgentStatus(session.id, agentId);
      if (!result.ok) return NextResponse.json(result, { status: 404 });
      return NextResponse.json(result);
    }
    const result = await updateAgentPolicy(session.id, agentId, body);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable.";
    return NextResponse.json({ ok: false, reason: message }, { status: 503 });
  }
}

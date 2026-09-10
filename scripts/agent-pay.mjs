#!/usr/bin/env node
/**
 * Prove an agent can pay without a browser.
 * Issues a one-shot ak_ key (or uses AGENT_KEY), POSTs /api/pay twice:
 * search should settle, unknown should 402.
 */

const COOKIE = "aw_session";

async function main() {
  const base = await resolveBase();
  const handle = process.env.AW_HANDLE ?? "sunik.pay";
  const password = process.env.AW_PASSWORD ?? "demo";
  let token = process.env.AGENT_KEY ?? "";
  let session = "";
  let agentId = "";
  let keyId = "";

  if (!token) {
    const login = await request(base, "/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle, password }),
    });
    session = cookieFrom(login.res);
    if (!login.body.ok || !session) {
      fail("Login failed.", login.body);
    }

    const listed = await request(base, "/api/agents", {
      headers: { cookie: `${COOKIE}=${session}` },
    });
    if (!listed.body.ok) fail("Could not list agents.", listed.body);
    const agents = listed.body.agents ?? [];
    const research =
      agents.find((a) => a.handle === "research-agent.pay") ?? agents[0];
    if (!research) fail("No agent wallet on this account.");
    agentId = research.id;

    const issued = await request(base, `/api/agents/${agentId}/keys`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${COOKIE}=${session}`,
      },
      body: JSON.stringify({ name: "agent-pay-cli" }),
    });
    if (!issued.body.ok || !issued.body.key?.token) {
      fail(
        "Could not issue ak_ key. Revoke one on the agent page, or set AGENT_KEY.",
        issued.body,
      );
    }
    token = issued.body.key.token;
    keyId = issued.body.key.id;
    console.log(`Issued ${hint(token)} for ${research.handle}`);
    console.log("(token is used on /api/pay, then revoked)\n");
  } else {
    console.log(`Using AGENT_KEY ${hint(token)}\n`);
  }

  const search = await pay(base, token, "search", "allowlist — should settle");
  const blocked = await pay(base, token, "unknown", "not on allowlist — should 402");

  if (session && agentId && keyId) {
    await request(base, `/api/agents/${agentId}/keys/${keyId}`, {
      method: "DELETE",
      headers: { cookie: `${COOKIE}=${session}` },
    });
    console.log(`\nRevoked ${hint(token)}`);
  }

  if (!search.ok || blocked.ok || blocked.res.status !== 402) {
    fail("Expected search to settle and unknown to 402.");
  }

  console.log("\nRefresh the app. Receipts are on the agent and Activity.");
}

async function pay(base, token, apiId, note) {
  const stamp = `${Date.now()}-${apiId}`;
  const { res, body } = await request(base, "/api/pay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      apiId,
      idempotencyKey: `agent-pay-${stamp}`,
    }),
  });
  const line = body.ok
    ? `HTTP ${res.status} settle · ${body.reason ?? "ok"}`
    : `HTTP ${res.status} ${body.reason ?? "denied"}`;
  console.log(`POST /api/pay  apiId=${apiId}  (${note})`);
  console.log(`  ${line}`);
  if (body.paymentId) console.log(`  paymentId ${body.paymentId}`);
  return { res, body, ok: Boolean(body.ok) };
}

async function resolveBase() {
  if (process.env.AW_URL) return process.env.AW_URL.replace(/\/$/, "");
  for (const port of [3000, 3001, 3002]) {
    const url = `http://127.0.0.1:${port}`;
    try {
      const res = await fetch(`${url}/login`, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status === 307) return url;
    } catch {
      // try next port
    }
  }
  fail("No app on :3000/:3001/:3002. Run npm run dev, or set AW_URL.");
}

function cookieFrom(res) {
  const lines =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
  for (const line of lines) {
    const match = new RegExp(`${COOKIE}=([^;]+)`).exec(line);
    if (match) return match[1];
  }
  return "";
}

function hint(token) {
  return `${token.slice(0, 10)}…`;
}

async function request(base, path, init = {}) {
  const res = await fetch(`${base}${path}`, init);
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = { ok: false, reason: await res.text() };
  }
  return { res, body };
}

function fail(message, extra) {
  console.error(message);
  if (extra) console.error(extra);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

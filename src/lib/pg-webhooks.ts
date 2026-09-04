import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, webhookEndpoints } from "@/db";
import { centsToUsd } from "@/lib/cents";

export const MAX_WEBHOOKS_PER_OWNER = 5;
const POST_TIMEOUT_MS = 2000;

export type WebhookEndpointDto = {
  id: string;
  url: string;
  secretHint: string;
  createdAt: string;
};

export type WebhookCreated = WebhookEndpointDto & {
  secret: string;
};

export type PaymentWebhookStatus = "settled" | "blocked";

export type PaymentWebhookPayload = {
  paymentId: string;
  agentId: string;
  apiId: string;
  apiName: string;
  host: string;
  amountCents: number;
  status: PaymentWebhookStatus;
  reason: string;
  transferId: string | null;
};

export type WebhookEvent = {
  id: string;
  type: "agent.payment.settled" | "agent.payment.blocked";
  created: string;
  data: {
    paymentId: string;
    agentId: string;
    apiId: string;
    apiName: string;
    host: string;
    amountUsd: number;
    status: PaymentWebhookStatus;
    reason: string;
    transferId: string | null;
  };
};

export type WebhookPoster = (input: {
  url: string;
  body: string;
  headers: Record<string, string>;
}) => Promise<{ ok: boolean }>;

function secretHint(secret: string) {
  return `${secret.slice(0, 6)}…${secret.slice(-4)}`;
}

function toDto(row: typeof webhookEndpoints.$inferSelect): WebhookEndpointDto {
  return {
    id: row.id,
    url: row.url,
    secretHint: secretHint(row.secret),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export function parseWebhookUrl(
  raw: string,
  opts?: { production?: boolean },
) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false as const, reason: "Missing URL." };
  if (trimmed.length > 2048) return { ok: false as const, reason: "URL is too long." };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false as const, reason: "Invalid URL." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false as const, reason: "URL must be http or https." };
  }
  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const production = opts?.production ?? process.env.NODE_ENV === "production";
  if (production && parsed.protocol !== "https:" && !isLocal) {
    return { ok: false as const, reason: "Production webhooks must use https." };
  }
  return { ok: true as const, url: parsed.toString() };
}

export function signWebhookPayload(
  secret: string,
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const v1 = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return {
    header: `t=${timestamp},v1=${v1}`,
    timestamp,
    v1,
  };
}

export function verifyWebhookSignature(
  secret: string,
  header: string,
  body: string,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = 300,
) {
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const i = piece.indexOf("=");
    if (i === -1) continue;
    parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  const timestamp = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(timestamp) || !v1) return false;
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;
  const expected = signWebhookPayload(secret, body, timestamp).v1;
  const a = Buffer.from(v1, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildPaymentWebhookEvent(
  payload: PaymentWebhookPayload,
): WebhookEvent {
  return {
    id: `evt_${payload.paymentId.replace(/-/g, "").slice(0, 24)}`,
    type:
      payload.status === "settled"
        ? "agent.payment.settled"
        : "agent.payment.blocked",
    created: new Date().toISOString(),
    data: {
      paymentId: payload.paymentId,
      agentId: payload.agentId,
      apiId: payload.apiId,
      apiName: payload.apiName,
      host: payload.host,
      amountUsd: centsToUsd(payload.amountCents),
      status: payload.status,
      reason: payload.reason,
      transferId: payload.transferId,
    },
  };
}

export async function defaultWebhookPoster({
  url,
  body,
  headers,
}: {
  url: string;
  body: string;
  headers: Record<string, string>;
}) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(POST_TIMEOUT_MS),
  });
  return { ok: res.ok };
}

async function postWithRetry(
  poster: WebhookPoster,
  input: { url: string; body: string; headers: Record<string, string> },
) {
  const first = await poster(input).catch(() => ({ ok: false }));
  if (first.ok) return true;
  const second = await poster(input).catch(() => ({ ok: false }));
  return second.ok;
}

export async function listWebhooksForOwner(ownerUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.ownerUserId, ownerUserId))
    .orderBy(desc(webhookEndpoints.createdAt));
  return rows.map(toDto);
}

export async function createWebhookEndpoint(ownerUserId: string, rawUrl: string) {
  const parsed = parseWebhookUrl(rawUrl);
  if (!parsed.ok) return parsed;

  const existing = await listWebhooksForOwner(ownerUserId);
  if (existing.length >= MAX_WEBHOOKS_PER_OWNER) {
    return {
      ok: false as const,
      reason: `At most ${MAX_WEBHOOKS_PER_OWNER} webhook URLs.`,
    };
  }

  const db = getDb();
  const duplicate = existing.find((row) => row.url === parsed.url);
  if (duplicate) {
    return { ok: false as const, reason: "That URL is already registered." };
  }

  const id = crypto.randomUUID();
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  try {
    const [row] = await db
      .insert(webhookEndpoints)
      .values({
        id,
        ownerUserId,
        url: parsed.url,
        secret,
      })
      .returning();
    if (!row) return { ok: false as const, reason: "Could not create webhook." };
    return {
      ok: true as const,
      endpoint: { ...toDto(row), secret } satisfies WebhookCreated,
    };
  } catch {
    return { ok: false as const, reason: "That URL is already registered." };
  }
}

export async function deleteWebhookEndpoint(
  ownerUserId: string,
  endpointId: string,
) {
  const db = getDb();
  const deleted = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.ownerUserId, ownerUserId),
      ),
    )
    .returning();
  if (deleted.length === 0) {
    return { ok: false as const, reason: "Webhook not found." };
  }
  return { ok: true as const };
}

export async function notifyPaymentWebhooks(
  ownerUserId: string,
  payload: PaymentWebhookPayload,
  poster: WebhookPoster = defaultWebhookPoster,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.ownerUserId, ownerUserId));
  if (rows.length === 0) return { delivered: 0 };

  const event = buildPaymentWebhookEvent(payload);
  const body = JSON.stringify(event);
  let delivered = 0;
  for (const row of rows) {
    const { header } = signWebhookPayload(row.secret, body);
    const ok = await postWithRetry(poster, {
      url: row.url,
      body,
      headers: {
        "Content-Type": "application/json",
        "X-Autowallet-Signature": header,
      },
    });
    if (ok) delivered += 1;
  }
  return { delivered };
}

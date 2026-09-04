import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { findUserByHandle } from "@/lib/pg-ledger";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  MAX_WEBHOOKS_PER_OWNER,
  notifyPaymentWebhooks,
  parseWebhookUrl,
  signWebhookPayload,
  verifyWebhookSignature,
  type WebhookPoster,
} from "@/lib/pg-webhooks";

describe("webhook signatures", () => {
  it("signs and verifies a payload", () => {
    const secret = "whsec_test";
    const body = JSON.stringify({ ok: true });
    const { header } = signWebhookPayload(secret, body, 1_700_000_000);
    expect(
      verifyWebhookSignature(secret, header, body, 1_700_000_000),
    ).toBe(true);
    expect(
      verifyWebhookSignature("wrong", header, body, 1_700_000_000),
    ).toBe(false);
    expect(
      verifyWebhookSignature(secret, header, body, 1_700_000_000 + 400),
    ).toBe(false);
  });

  it("rejects non-http URLs and requires https in production", () => {
    expect(parseWebhookUrl("ftp://x.com/hook").ok).toBe(false);
    expect(parseWebhookUrl("https://hooks.example.com/aw").ok).toBe(true);
    expect(parseWebhookUrl("http://hooks.example.com/aw", { production: true }).ok).toBe(
      false,
    );
    expect(parseWebhookUrl("http://localhost:9999/hook", { production: true }).ok).toBe(
      true,
    );
  });
});

describe("webhook endpoints", () => {
  it(
    "creates, lists, and delivers a signed event with one retry",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const url = `https://hooks.example.com/aw-${Date.now()}`;
      const created = await createWebhookEndpoint(sunik.id, url);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.endpoint.secret.startsWith("whsec_")).toBe(true);

      const again = await createWebhookEndpoint(sunik.id, url);
      expect(again.ok).toBe(false);

      let calls = 0;
      const poster: WebhookPoster = async ({ body, headers }) => {
        calls += 1;
        const sig = headers["X-Autowallet-Signature"] ?? "";
        expect(
          verifyWebhookSignature(created.endpoint.secret, sig, body),
        ).toBe(true);
        const event = JSON.parse(body) as {
          type: string;
          data: { status: string; paymentId: string };
        };
        expect(event.type).toBe("agent.payment.blocked");
        expect(event.data.status).toBe("blocked");
        expect(event.data.paymentId).toBe("pay-test");
        if (calls === 1) return { ok: false };
        return { ok: true };
      };

      const result = await notifyPaymentWebhooks(
        sunik.id,
        {
          paymentId: "pay-test",
          agentId: "agent-test",
          apiId: "unknown",
          apiName: "Unknown API",
          host: "unknown.api",
          amountCents: 200,
          status: "blocked",
          reason: "domain not on allowlist",
          transferId: null,
        },
        poster,
      );
      expect(calls).toBe(2);
      expect(result.delivered).toBe(1);

      const removed = await deleteWebhookEndpoint(
        sunik.id,
        created.endpoint.id,
      );
      expect(removed.ok).toBe(true);
      const hidden = await deleteWebhookEndpoint(sunik.id, created.endpoint.id);
      expect(hidden.ok).toBe(false);
    },
    20000,
  );

  it(
    "caps endpoints per owner",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const stamp = Date.now();
      for (let i = 0; i < MAX_WEBHOOKS_PER_OWNER + 1; i += 1) {
        await createWebhookEndpoint(
          sunik.id,
          `https://hooks.example.com/cap-${stamp}-${i}`,
        );
      }
      const overflow = await createWebhookEndpoint(
        sunik.id,
        `https://hooks.example.com/cap-${stamp}-overflow`,
      );
      expect(overflow.ok).toBe(false);
      if (!overflow.ok) {
        expect(overflow.reason).toContain("At most");
      }
    },
    20000,
  );
});

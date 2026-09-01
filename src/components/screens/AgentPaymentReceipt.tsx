"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTxTime, money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type AgentPaymentReceiptData = {
  id: string;
  agentId: string;
  agentName: string;
  agentHandle: string;
  apiId: string;
  apiName: string;
  host: string;
  amountUsd: number;
  status: "settled" | "blocked";
  reason: string;
  at: string;
  transferId: string | null;
  vendorHandle: string | null;
  vendorName: string | null;
};

export function AgentPaymentReceipt({ paymentId }: { paymentId: string }) {
  const [payment, setPayment] = useState<AgentPaymentReceiptData | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/agent-payments/${paymentId}`);
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        payment?: AgentPaymentReceiptData;
      };
      if (cancelled) return;
      if (!data.ok || !data.payment) {
        setError(data.reason ?? "Payment not found.");
        setPayment(null);
      } else {
        setError("");
        setPayment(data.payment);
      }
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  return (
    <section className={tw.page}>
      <Link href="/agents" className={tw.back}>
        ← Agents
      </Link>
      <h1 className={tw.h1}>Agent payment receipt</h1>
      <p className={tw.sub}>402 pay row on the ledger — settled or blocked by policy.</p>

      {!ready ? (
        <p className={cx(tw.muted, "mt-4")}>Loading…</p>
      ) : error || !payment ? (
        <p className="mt-4 font-semibold text-bad">{error || "Payment not found."}</p>
      ) : (
        <article className={cx(tw.card, "mt-4")}>
          <span className={tw.kicker}>Amount</span>
          <strong className="mt-2 mb-4 block text-4xl tracking-tight text-brand">
            {money(payment.amountUsd)}
          </strong>
          <div className={tw.meta}>
            <div>
              <span className="block text-xs text-muted">Agent</span>
              <b className="text-[15px]">{payment.agentName}</b>
              <p className={tw.handle}>{payment.agentHandle}</p>
            </div>
            <div>
              <span className="block text-xs text-muted">API</span>
              <b className="text-[15px]">{payment.apiName}</b>
              <p className={tw.handle}>{payment.host}</p>
            </div>
            <div>
              <span className="block text-xs text-muted">Status</span>
              <em
                className={
                  payment.status === "settled" ? tw.pillOk : tw.pillBad
                }
              >
                {payment.status === "settled" ? "Settled" : "Blocked"}
              </em>
            </div>
          </div>
          {payment.vendorHandle ? (
            <>
              <p className={cx(tw.kicker, "mt-5")}>Vendor</p>
              <p className="mt-1 text-sm">
                {payment.vendorName ?? payment.vendorHandle}
                <span className={cx(tw.handle, "ml-2")}>{payment.vendorHandle}</span>
              </p>
            </>
          ) : null}
          <p className={cx(tw.kicker, "mt-5")}>Policy / outcome</p>
          <p className="mt-1 text-sm">{payment.reason}</p>
          <p className={cx(tw.kicker, "mt-5")}>Time</p>
          <p className={cx(tw.muted, "mt-1 font-mono text-[13px]")}>
            {formatTxTime(payment.at)}
          </p>
          <p className={cx(tw.kicker, "mt-5")}>Payment id</p>
          <p className="mt-1 break-all font-mono text-[13px] text-muted">
            {payment.id}
          </p>
          {payment.transferId ? (
            <>
              <p className={cx(tw.kicker, "mt-5")}>Ledger transfer</p>
              <Link
                href={`/activity/${payment.transferId}`}
                className={cx(tw.textBtn, "mt-1 inline-block font-mono text-[13px]")}
              >
                {payment.transferId} → P2P receipt
              </Link>
            </>
          ) : null}
          <Link
            href={`/agents/${payment.agentId}`}
            className={cx(tw.btn, "mt-6 inline-block")}
          >
            Back to agent
          </Link>
        </article>
      )}
    </section>
  );
}

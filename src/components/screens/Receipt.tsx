"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTxTime, money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type ReceiptTransfer = {
  id: string;
  fromHandle: string;
  fromName: string;
  toHandle: string;
  toName: string;
  amountUsd: number;
  memo: string;
  at: string;
  status: string;
};

export function Receipt({ transferId }: { transferId: string }) {
  const [transfer, setTransfer] = useState<ReceiptTransfer | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/transfers/${transferId}`);
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        transfer?: ReceiptTransfer;
      };
      if (cancelled) return;
      if (!data.ok || !data.transfer) {
        setError(data.reason ?? "Transfer not found.");
        setTransfer(null);
      } else {
        setError("");
        setTransfer(data.transfer);
      }
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [transferId]);

  return (
    <section className={tw.page}>
      <Link href="/activity" className={tw.back}>
        ← Activity
      </Link>
      <h1 className={tw.h1}>Receipt</h1>
      <p className={tw.sub}>One ledger row. Fake money, real id.</p>

      {!ready ? (
        <p className={cx(tw.muted, "mt-4")}>Loading…</p>
      ) : error || !transfer ? (
        <p className="mt-4 font-semibold text-bad">{error || "Transfer not found."}</p>
      ) : (
        <article className={cx(tw.card, "mt-4")}>
          <span className={tw.kicker}>Amount</span>
          <strong className="mt-2 mb-4 block text-4xl tracking-tight text-brand">
            {money(transfer.amountUsd)}
          </strong>
          <div className={tw.meta}>
            <div>
              <span className="block text-xs text-muted">From</span>
              <b className="text-[15px]">{transfer.fromName}</b>
              <p className={tw.handle}>{transfer.fromHandle}</p>
            </div>
            <div>
              <span className="block text-xs text-muted">To</span>
              <b className="text-[15px]">{transfer.toName}</b>
              <p className={tw.handle}>{transfer.toHandle}</p>
            </div>
            <div>
              <span className="block text-xs text-muted">Status</span>
              <b className="text-[15px]">{transfer.status}</b>
            </div>
          </div>
          <p className={cx(tw.kicker, "mt-5")}>Memo</p>
          <p className="mt-1 text-sm">{transfer.memo}</p>
          <p className={cx(tw.kicker, "mt-5")}>Time</p>
          <p className={cx(tw.muted, "mt-1 font-mono text-[13px]")}>
            {formatTxTime(transfer.at)}
          </p>
          <p className={cx(tw.kicker, "mt-5")}>Transfer id</p>
          <p className="mt-1 break-all font-mono text-[13px] text-muted">
            {transfer.id}
          </p>
        </article>
      )}
    </section>
  );
}

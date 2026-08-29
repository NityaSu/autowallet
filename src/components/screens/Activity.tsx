"use client";

import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";

export function Activity() {
  const { agents, payments, transfers } = useWallet();

  function agentName(id: string) {
    return agents.find((a) => a.id === id)?.name ?? "Agent";
  }

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Activity</h1>
      <p className={tw.sub}>Person-to-person sends, then agent API payments.</p>

      <h2 className={tw.h2}>Sends</h2>
      {transfers.length === 0 ? (
        <p className={tw.muted}>No person-to-person sends yet.</p>
      ) : (
        <ul className={tw.pay}>
          {transfers.map((tx) => (
            <li key={tx.id} className={tw.payItem}>
              <span>
                {tx.fromHandle} → {tx.toHandle}
                <span className={tw.muted}>
                  {" "}
                  · {tx.memo} · {tx.at}
                </span>
              </span>
              <b className={tw.amt}>{money(tx.amountUsd)}</b>
              <em className={tw.ok}>✓ Sent</em>
            </li>
          ))}
        </ul>
      )}

      <h2 className={tw.h2}>Agent payments</h2>
      <ul className={tw.pay}>
        {payments.map((tx) => (
          <li key={tx.id} className={tw.payItem}>
            <span>
              {agentName(tx.agentId)} → {tx.apiName}
              <span className={tw.muted}> · {tx.at}</span>
            </span>
            <b className={tw.amt}>{money(tx.amountUsd)}</b>
            <em className={tx.status === "settled" ? tw.ok : tw.bad}>
              {tx.status === "settled" ? "✓ Settled" : "✕ Blocked"}
            </em>
          </li>
        ))}
      </ul>
    </section>
  );
}

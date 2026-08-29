"use client";

import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

export function Activity() {
  const { agents, payments, transfers } = useWallet();

  function agentName(id: string) {
    return agents.find((a) => a.id === id)?.name ?? "Agent";
  }

  return (
    <section className="aw-page">
      <h1 className="aw-h1">Activity</h1>
      <p className="aw-sub">Person-to-person sends, then agent API payments.</p>

      <h2 className="aw-h2">Sends</h2>
      {transfers.length === 0 ? (
        <p className="aw-muted">No person-to-person sends yet.</p>
      ) : (
        <ul className="aw-pay">
          {transfers.map((tx) => (
            <li key={tx.id}>
              <span>
                {tx.fromHandle} → {tx.toHandle}
                <span className="aw-muted">
                  {" "}
                  · {tx.memo} · {tx.at}
                </span>
              </span>
              <b className="amt">{money(tx.amountUsd)}</b>
              <em className="ok">✓ Sent</em>
            </li>
          ))}
        </ul>
      )}

      <h2 className="aw-h2">Agent payments</h2>
      <ul className="aw-pay">
        {payments.map((tx) => (
          <li key={tx.id}>
            <span>
              {agentName(tx.agentId)} → {tx.apiName}
              <span className="aw-muted"> · {tx.at}</span>
            </span>
            <b className="amt">{money(tx.amountUsd)}</b>
            <em className={tx.status === "settled" ? "ok" : "bad"}>
              {tx.status === "settled" ? "✓ Settled" : "✕ Blocked"}
            </em>
          </li>
        ))}
      </ul>
    </section>
  );
}

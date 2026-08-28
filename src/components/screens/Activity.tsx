"use client";

import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

export function Activity() {
  const { agents, payments } = useWallet();

  function agentName(id: string) {
    return agents.find((a) => a.id === id)?.name ?? "Agent";
  }

  return (
    <section className="aw-page">
      <h1 className="aw-h1">Activity</h1>
      <p className="aw-sub">Every settled and blocked payment from virtual wallets.</p>
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

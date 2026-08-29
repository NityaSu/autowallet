"use client";

import { FormEvent, useMemo, useState } from "react";
import { YOU_HANDLE } from "@/data/wallets";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

export function Send() {
  const { you, people, transfers, sendToPerson } = useWallet();
  const them = people.find((p) => p.handle !== YOU_HANDLE);
  const [to, setTo] = useState(them?.handle ?? "");
  const [amount, setAmount] = useState("5.00");
  const [memo, setMemo] = useState("coffee");
  const [error, setError] = useState("");

  const preview = useMemo(() => Number.parseFloat(amount) || 0, [amount]);
  const recipient = people.find((p) => p.handle === to.trim().toLowerCase());

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = sendToPerson({
      toHandle: to,
      amount: preview,
      memo,
    });
    if (!result.ok) setError(result.reason);
  }

  return (
    <section className="aw-page">
      <h1 className="aw-h1">Send</h1>
      <p className="aw-sub">
        Person to person. Balances update in the browser — no agents, no ledger
        yet.
      </p>

      <div className="aw-ov-stats" style={{ marginTop: 18 }}>
        <article className="aw-ov-stat">
          <div>
            <span>You</span>
            <strong className="is-orange">{money(you.balanceUsd)}</strong>
            <em>
              {you.name} · {you.handle}
            </em>
          </div>
        </article>
        {them ? (
          <article className="aw-ov-stat">
            <div>
              <span>Them</span>
              <strong>{money(them.balanceUsd)}</strong>
              <em>
                {them.name} · {them.handle}
              </em>
            </div>
          </article>
        ) : null}
      </div>

      <form className="aw-card" style={{ marginTop: 16 }} onSubmit={onSubmit}>
        <label className="aw-field">
          To
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="aw-field" style={{ marginTop: 12 }}>
          Amount
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="aw-field" style={{ marginTop: 12 }}>
          Memo
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        {error ? (
          <p style={{ margin: "12px 0 0", fontWeight: 650, color: "var(--bad)" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="aw-btn primary" style={{ marginTop: 16 }}>
          Send {preview > 0 ? money(preview) : ""}{" "}
          {recipient ? `to ${recipient.handle}` : ""}
        </button>
      </form>

      <h2 className="aw-h2">Transfers</h2>
      {transfers.length === 0 ? (
        <p className="aw-muted">Nothing sent yet.</p>
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
    </section>
  );
}

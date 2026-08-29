"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function Send() {
  const { you, people, transfers, sendToPerson, ledgerReady, ledgerError } =
    useWallet();
  const others = people.filter((p) => p.handle !== you.handle);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5.00");
  const [memo, setMemo] = useState("coffee");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const keyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    const other = people.find((p) => p.handle !== you.handle);
    if (other) setTo((current) => current || other.handle);
  }, [you.handle, people]);

  const preview = useMemo(() => Number.parseFloat(amount) || 0, [amount]);
  const recipient = people.find((p) => p.handle === to.trim().toLowerCase());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await sendToPerson({
        toHandle: to,
        amount: preview,
        memo,
        idempotencyKey: keyRef.current,
      });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      keyRef.current = crypto.randomUUID();
    } catch {
      setError("Could not reach the ledger.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Send</h1>
      <p className={tw.sub}>
        Person to person. Fake money on a Postgres ledger — refresh keeps the
        balance.
      </p>
      {ledgerError ? (
        <p className="font-semibold text-bad">{ledgerError}</p>
      ) : null}

      <div className={cx(tw.stats, "mt-[18px]")}>
        <article className={tw.stat}>
          <div>
            <span className="block text-xs font-semibold text-muted">You</span>
            <strong className="mt-2 mb-1.5 block text-[26px] tracking-tight text-brand">
              {money(you.balanceUsd)}
            </strong>
            <em className="text-xs not-italic text-muted">
              {you.name} · {you.handle}
            </em>
          </div>
        </article>
        {recipient ? (
          <article className={tw.stat}>
            <div>
              <span className="block text-xs font-semibold text-muted">Them</span>
              <strong className="mt-2 mb-1.5 block text-[26px] tracking-tight">
                {money(recipient.balanceUsd)}
              </strong>
              <em className="text-xs not-italic text-muted">
                {recipient.name} · {recipient.handle}
              </em>
            </div>
          </article>
        ) : null}
      </div>

      <form className={cx(tw.card, "mt-4")} onSubmit={onSubmit}>
        <label className={tw.field}>
          To
          {others.length > 0 ? (
            <select
              className={tw.control}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {others.map((person) => (
                <option key={person.id} value={person.handle}>
                  {person.name} · {person.handle}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={tw.control}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoComplete="off"
            />
          )}
        </label>
        <label className={cx(tw.field, "mt-3")}>
          Amount
          <input
            className={tw.control}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className={cx(tw.field, "mt-3")}>
          Memo
          <input
            className={tw.control}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>
        {error ? (
          <p className="mt-3 font-semibold text-bad">{error}</p>
        ) : null}
        <button
          type="submit"
          className={cx(tw.btnPrimary, "mt-4")}
          disabled={pending || !ledgerReady}
        >
          Send {preview > 0 ? money(preview) : ""}{" "}
          {recipient ? `to ${recipient.handle}` : ""}
        </button>
      </form>

      <h2 className={tw.h2}>Transfers</h2>
      {transfers.length === 0 ? (
        <p className={tw.muted}>Nothing sent yet.</p>
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
              <em className={tw.ok}>✓ Settled</em>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

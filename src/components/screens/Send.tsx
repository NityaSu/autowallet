"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useWallet } from "@/context/WalletProvider";
import { CopyHandle } from "@/components/CopyHandle";
import { completeHandle } from "@/lib/ledger-types";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type Found = { id: string; name: string; handle: string };

export function Send() {
  const search = useSearchParams();
  const { you, people, transfers, sendToPerson, ledgerReady, ledgerError } =
    useWallet();
  const recent = people.filter((p) => p.handle !== you.handle);
  const [to, setTo] = useState(search.get("to") ?? "");
  const [amount, setAmount] = useState("5.00");
  const [memo, setMemo] = useState("coffee");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [step, setStep] = useState<"draft" | "confirm">("draft");
  const keyRef = useRef(crypto.randomUUID());

  const preview = useMemo(() => Number.parseFloat(amount) || 0, [amount]);

  async function lookup(handle = to) {
    const res = await fetch(
      `/api/people?handle=${encodeURIComponent(completeHandle(handle))}`,
    );
    const data = (await res.json()) as {
      ok: boolean;
      reason?: string;
      person?: Found;
    };
    if (!data.ok || !data.person) {
      setFound(null);
      setStep("draft");
      return { ok: false as const, reason: data.reason ?? "Nobody at that handle." };
    }
    setFound(data.person);
    setTo(data.person.handle);
    return { ok: true as const, person: data.person };
  }

  async function onContinue(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await lookup();
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      if (!Number.isFinite(preview) || preview <= 0) {
        setError("Enter an amount.");
        return;
      }
      setStep("confirm");
    } catch {
      setError("Could not look up that handle.");
    } finally {
      setPending(false);
    }
  }

  async function onConfirm() {
    if (!found) return;
    setError("");
    setPending(true);
    try {
      const result = await sendToPerson({
        toHandle: found.handle,
        amount: preview,
        memo,
        idempotencyKey: keyRef.current,
      });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      keyRef.current = crypto.randomUUID();
      setStep("draft");
      setFound(null);
      setTo("");
    } catch {
      setError("Could not reach the ledger.");
    } finally {
      setPending(false);
    }
  }

  async function pickRecent(handle: string) {
    setTo(handle);
    setError("");
    setPending(true);
    try {
      const result = await lookup(handle);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setStep("confirm");
    } catch {
      setError("Could not look up that handle.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Send</h1>
      <p className={tw.sub}>
        Type a handle, confirm the name, then send. Recent people come from
        your own transfers — not everyone on AutoWallet.
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
            <em className="mb-3 block text-xs not-italic text-muted">
              {you.name} · {you.handle}
            </em>
            <CopyHandle handle={you.handle} />
          </div>
        </article>
        {found ? (
          <article className={tw.stat}>
            <div>
              <span className="block text-xs font-semibold text-muted">Them</span>
              <strong className="mt-2 mb-1.5 block text-[26px] tracking-tight">
                {found.name}
              </strong>
              <em className="text-xs not-italic text-muted">{found.handle}</em>
            </div>
          </article>
        ) : null}
      </div>

      {step === "draft" ? (
        <form className={cx(tw.card, "mt-4")} onSubmit={onContinue}>
          <label className={tw.field}>
            To
            <input
              className={tw.control}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setFound(null);
              }}
              placeholder="midas.pay"
              autoComplete="off"
              spellCheck={false}
            />
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
            Continue
          </button>
        </form>
      ) : (
        <div className={cx(tw.card, "mt-4")}>
          <p className="m-0 text-base font-semibold text-foreground">
            Send {money(preview)} to {found?.name} · {found?.handle}?
          </p>
          {memo ? (
            <p className={cx(tw.muted, "mt-2 mb-0 text-sm")}>Memo: {memo}</p>
          ) : null}
          {error ? (
            <p className="mt-3 font-semibold text-bad">{error}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={tw.btnPrimary}
              disabled={pending || !ledgerReady}
              onClick={() => void onConfirm()}
            >
              Send {preview > 0 ? money(preview) : ""} to {found?.name}
            </button>
            <button
              type="button"
              className={tw.btn}
              disabled={pending}
              onClick={() => {
                setStep("draft");
                setError("");
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      <h2 className={tw.h2}>Recent</h2>
      {recent.length === 0 ? (
        <p className={tw.muted}>
          No one yet. Type a handle to send — they show up here after the first
          transfer.
        </p>
      ) : (
        <ul className={tw.pay}>
          {recent.map((person) => (
            <li key={person.id} className={tw.payItem}>
              <button
                type="button"
                className="contents cursor-pointer text-left text-foreground"
                onClick={() => void pickRecent(person.handle)}
              >
                <span>
                  <strong className="font-semibold">{person.name}</strong>
                  <span className={tw.muted}> · {person.handle}</span>
                </span>
                <em className="text-xs font-semibold not-italic text-brand">
                  Send →
                </em>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className={tw.h2}>Transfers</h2>
      {transfers.length === 0 ? (
        <p className={tw.muted}>Nothing sent yet.</p>
      ) : (
        <ul className={tw.pay}>
          {transfers.map((tx) => (
            <li key={tx.id} className={tw.payItem}>
              <Link
                href={`/activity/${tx.id}`}
                className="contents text-foreground no-underline"
              >
                <span>
                  {tx.fromHandle} → {tx.toHandle}
                  <span className={tw.muted}>
                    {" "}
                    · {tx.memo} · {tx.at}
                  </span>
                </span>
                <b className={tw.amt}>{money(tx.amountUsd)}</b>
                <em className={tw.ok}>✓ Settled</em>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

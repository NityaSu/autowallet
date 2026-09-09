"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { completeHandle } from "@/lib/ledger-types";
import { money } from "@/lib/money";
import { pingNotifications } from "@/lib/notify-ping";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type Found = { id: string; name: string; handle: string };

type Incoming = {
  id: string;
  amountUsd: number;
  memo: string;
  from: { name: string; handle: string };
};

export function RequestMoney() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5.00");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [step, setStep] = useState<"draft" | "confirm">("draft");
  const [done, setDone] = useState("");
  const [incoming, setIncoming] = useState<Incoming[]>([]);

  const preview = useMemo(() => Number.parseFloat(amount) || 0, [amount]);

  const loadIncoming = useCallback(async () => {
    const res = await fetch("/api/requests");
    const data = (await res.json()) as {
      ok: boolean;
      incoming?: Incoming[];
    };
    if (data.ok) setIncoming(data.incoming ?? []);
  }, []);

  useEffect(() => {
    // Inbox of open requests for the signed-in payer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadIncoming();
  }, [loadIncoming]);

  async function lookup(handle: string) {
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
    setDone("");
    setPending(true);
    try {
      const result = await lookup(to);
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
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toHandle: found.handle,
          amount: preview,
          memo,
        }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        setError(data.reason ?? "Could not send the request.");
        return;
      }
      pingNotifications();
      setDone(`Asked ${found.name} for ${money(preview)}.`);
      setStep("draft");
      setFound(null);
      setTo("");
    } catch {
      setError("Could not send the request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {found ? (
        <article className={cx(tw.stat, "mb-4")}>
          <div>
            <span className="block text-xs font-semibold text-muted">Ask</span>
            <strong className="mt-2 mb-1.5 block text-[26px] tracking-tight">
              {found.name}
            </strong>
            <em className="text-xs not-italic text-muted">{found.handle}</em>
          </div>
        </article>
      ) : null}

      {step === "draft" ? (
        <form className={tw.card} onSubmit={onContinue}>
          <label className={tw.field}>
            Ask
            <input
              className={tw.control}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setFound(null);
                setDone("");
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
              placeholder="optional"
            />
          </label>
          {error ? (
            <p className="mt-3 font-semibold text-bad">{error}</p>
          ) : null}
          {done ? (
            <p className="mt-3 font-semibold text-ok">{done}</p>
          ) : null}
          <button type="submit" className={cx(tw.btnPrimary, "mt-4")} disabled={pending}>
            Continue
          </button>
        </form>
      ) : (
        <div className={tw.card}>
          <p className="m-0 text-base font-semibold text-foreground">
            Ask {found?.name} · {found?.handle} for {money(preview)}?
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
              disabled={pending}
              onClick={() => void onConfirm()}
            >
              Ask for {money(preview)}
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

      <h2 className={tw.h2}>Waiting on you</h2>
      {incoming.length === 0 ? (
        <p className={tw.muted}>No open requests. They show up here and in your inbox.</p>
      ) : (
        <ul className={tw.pay}>
          {incoming.map((item) => (
            <li key={item.id} className={tw.payItem}>
              <Link
                href={`/requests/${item.id}`}
                className="contents text-foreground no-underline"
              >
                <span>
                  <strong className="font-semibold">{item.from.name}</strong>
                  <span className={tw.muted}>
                    {" "}
                    · {item.from.handle}
                    {item.memo ? ` · ${item.memo}` : ""}
                  </span>
                </span>
                <b className={tw.amt}>{money(item.amountUsd)}</b>
                <em className="text-xs font-semibold not-italic text-brand">
                  Pay →
                </em>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import { pingNotifications } from "@/lib/notify-ping";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type RequestDto = {
  id: string;
  amountUsd: number;
  memo: string;
  status: "pending" | "paid";
  from: { id: string; name: string; handle: string };
  to: { id: string; name: string; handle: string };
  transferId: string | null;
};

export function RequestPay({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { you, refreshLedger } = useWallet();
  const [request, setRequest] = useState<RequestDto | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<"view" | "confirm">("view");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/requests/${requestId}`);
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        request?: RequestDto;
      };
      if (cancelled) return;
      if (!data.ok || !data.request) {
        setError(data.reason ?? "Request not found.");
        setRequest(null);
      } else {
        setError("");
        setRequest(data.request);
      }
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const isPayer = request?.to.id === you.id;
  const isMine = request?.from.id === you.id;

  async function onPay() {
    setError("");
    setPending(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/pay`, { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        request?: RequestDto;
      };
      if (!data.ok || !data.request) {
        setError(data.reason ?? "Could not pay.");
        return;
      }
      setRequest(data.request);
      setStep("view");
      pingNotifications();
      await refreshLedger();
      if (data.request.transferId) {
        router.push(`/activity/${data.request.transferId}`);
      }
    } catch {
      setError("Could not pay.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={tw.page}>
      <Link href="/send" className={tw.back}>
        ← Send
      </Link>
      <h1 className={tw.h1}>Payment request</h1>
      <p className={tw.sub}>Confirm the name, then send. Same as a normal transfer.</p>

      {!ready ? (
        <p className={cx(tw.muted, "mt-4")}>Loading…</p>
      ) : error && !request ? (
        <p className="mt-4 font-semibold text-bad">{error}</p>
      ) : request ? (
        <article className={cx(tw.card, "mt-4")}>
          <span className={tw.kicker}>
            {request.status === "paid" ? "Paid" : "Asked for"}
          </span>
          <strong className="mt-2 mb-4 block text-4xl tracking-tight text-brand">
            {money(request.amountUsd)}
          </strong>
          <div className={tw.meta}>
            <div>
              <span className="block text-xs text-muted">Asked by</span>
              <b className="text-[15px]">{request.from.name}</b>
              <p className={tw.handle}>{request.from.handle}</p>
            </div>
            <div>
              <span className="block text-xs text-muted">Pays</span>
              <b className="text-[15px]">{request.to.name}</b>
              <p className={tw.handle}>{request.to.handle}</p>
            </div>
          </div>
          {request.memo ? (
            <p className={cx(tw.muted, "mt-4 mb-0 text-sm")}>Memo: {request.memo}</p>
          ) : null}

          {request.status === "paid" && request.transferId ? (
            <Link
              href={`/activity/${request.transferId}`}
              className={cx(tw.textBtn, "mt-4 inline-block")}
            >
              View receipt →
            </Link>
          ) : null}

          {isMine && request.status === "pending" ? (
            <p className={cx(tw.muted, "mt-4 mb-0 text-sm")}>
              Waiting for {request.to.name} to pay.
            </p>
          ) : null}

          {isPayer && request.status === "pending" && step === "view" ? (
            <button
              type="button"
              className={cx(tw.btnPrimary, "mt-4")}
              disabled={pending}
              onClick={() => setStep("confirm")}
            >
              Continue
            </button>
          ) : null}

          {isPayer && request.status === "pending" && step === "confirm" ? (
            <div className="mt-4">
              <p className="m-0 text-base font-semibold">
                Send {money(request.amountUsd)} to {request.from.name} ·{" "}
                {request.from.handle}?
              </p>
              {error ? (
                <p className="mt-3 font-semibold text-bad">{error}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={tw.btnPrimary}
                  disabled={pending}
                  onClick={() => void onPay()}
                >
                  Send {money(request.amountUsd)} to {request.from.name}
                </button>
                <button
                  type="button"
                  className={tw.btn}
                  disabled={pending}
                  onClick={() => {
                    setStep("view");
                    setError("");
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}

          {error && request ? (
            step === "view" ? (
              <p className="mt-3 font-semibold text-bad">{error}</p>
            ) : null
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

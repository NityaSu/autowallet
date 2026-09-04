"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/context/WalletProvider";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type WebhookEndpoint = {
  id: string;
  url: string;
  secretHint: string;
  createdAt: string;
};

export function Settings() {
  const { you } = useWallet();
  const [url, setUrl] = useState("");
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const loadWebhooks = useCallback(async () => {
    const res = await fetch("/api/webhooks");
    const data = (await res.json()) as {
      ok: boolean;
      endpoints?: WebhookEndpoint[];
      reason?: string;
    };
    if (!data.ok) {
      setError(data.reason ?? "Could not load webhooks.");
      return;
    }
    setEndpoints(data.endpoints ?? []);
  }, []);

  useEffect(() => {
    // Settings loads owner webhook endpoints from the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWebhooks();
  }, [loadWebhooks]);

  async function onAdd() {
    setError("");
    setRevealedSecret("");
    setPending(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        endpoint?: WebhookEndpoint & { secret?: string };
      };
      if (!data.ok || !data.endpoint) {
        setError(data.reason ?? "Could not add webhook.");
        return;
      }
      setUrl("");
      setRevealedSecret(data.endpoint.secret ?? "");
      await loadWebhooks();
    } catch {
      setError("Could not add webhook.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    setError("");
    setPending(true);
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        setError(data.reason ?? "Could not remove webhook.");
        return;
      }
      if (revealedSecret) setRevealedSecret("");
      await loadWebhooks();
    } catch {
      setError("Could not remove webhook.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Settings</h1>
      <p className={tw.sub}>Account identity for this personal PoC.</p>
      <article className={tw.card}>
        <div className={tw.meta}>
          <div>
            <span className="block text-xs text-muted">Owner</span>
            <b className="text-[15px]">{you.name}</b>
          </div>
          <div>
            <span className="block text-xs text-muted">Handle</span>
            <b className="text-[15px]">{you.handle}</b>
          </div>
          <div>
            <span className="block text-xs text-muted">Rail</span>
            <b className="text-[15px]">Fake USD on Postgres</b>
          </div>
        </div>
      </article>

      <h2 className={tw.h2}>Webhooks</h2>
      <p className={tw.sub}>
        AutoWallet POSTs a signed event when an agent payment settles or is
        blocked. The signing secret is shown once.
      </p>
      <article className={cx(tw.card, "mt-3.5")}>
        <div className="flex flex-wrap items-end gap-3">
          <label className={cx(tw.field, "min-w-[280px] flex-1")}>
            <span>Endpoint URL</span>
            <input
              className={tw.control}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/autowallet"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className={tw.btnPrimary}
            disabled={pending || !url.trim()}
            onClick={() => void onAdd()}
          >
            Add endpoint
          </button>
        </div>

        {error ? <p className={cx(tw.bad, "mt-3")}>{error}</p> : null}

        {revealedSecret ? (
          <p className={cx(tw.note, "mt-4")}>
            Signing secret (copy now):{" "}
            <code className="font-mono text-[13px]">{revealedSecret}</code>
          </p>
        ) : null}

        {endpoints.length === 0 ? (
          <p className={cx(tw.muted, "mt-5")}>No webhook endpoints yet.</p>
        ) : (
          <ul className={cx(tw.pay, "mt-5")}>
            {endpoints.map((ep) => (
              <li key={ep.id} className={tw.payItem}>
                <span>
                  <span className="block font-mono text-[13px]">{ep.url}</span>
                  <span className={tw.muted}>{ep.secretHint}</span>
                </span>
                <button
                  type="button"
                  className={tw.textBtn}
                  disabled={pending}
                  onClick={() => void onDelete(ep.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>

      <p className={tw.note}>
        AutoWallet is a portfolio demo. P2P transfers and agent wallets are
        recorded on a real Postgres ledger with fake money.
      </p>
    </section>
  );
}

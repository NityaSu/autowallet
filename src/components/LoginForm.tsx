"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudMark } from "@/components/CloudMark";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [handle, setHandle] = useState("sunik.pay");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, password }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        setError(data.reason ?? "Could not log in.");
        return;
      }
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="aw-login">
      <div className="aw-login-card">
        <div className="aw-brand" style={{ margin: "0 0 18px" }}>
          <CloudMark width={38} height={25} />
          <span>
            <strong>AutoWallet</strong>
            <em>Demo — no real money</em>
          </span>
        </div>
        <p className="aw-sub" style={{ marginBottom: 16 }}>
          This is a portfolio demonstration. No real money is transacted. All
          balances are simulated.
        </p>
        <form onSubmit={onSubmit}>
          <label className="aw-field">
            Handle
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="aw-field" style={{ marginTop: 12 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p style={{ margin: "12px 0 0", fontWeight: 650, color: "var(--bad)" }}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="aw-btn primary"
            style={{ marginTop: 16, width: "100%" }}
            disabled={pending}
          >
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="aw-muted" style={{ marginTop: 16 }}>
          Demo accounts (password <b>demo</b>): <code>sunik.pay</code> ·{" "}
          <code>midas.pay</code>
        </p>
      </div>
    </div>
  );
}

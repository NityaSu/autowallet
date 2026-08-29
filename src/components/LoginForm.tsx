"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudMark } from "@/components/CloudMark";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

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
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-[0_18px_40px_rgba(45,24,16,0.08)]">
        <div className={cx(tw.brand, "mb-[18px]")}>
          <CloudMark width={38} height={25} />
          <span>
            <strong className={tw.brandName}>AutoWallet</strong>
            <em className={tw.brandTag}>Demo — no real money</em>
          </span>
        </div>
        <p className={cx(tw.sub, "mb-4")}>
          This is a portfolio demonstration. No real money is transacted. All
          balances are simulated.
        </p>
        <form onSubmit={onSubmit}>
          <label className={tw.field}>
            Handle
            <input
              className={tw.control}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className={cx(tw.field, "mt-3")}>
            Password
            <input
              className={tw.control}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p className="mt-3 font-semibold text-bad">{error}</p>
          ) : null}
          <button
            type="submit"
            className={cx(tw.btnPrimary, "mt-4 w-full")}
            disabled={pending}
          >
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className={cx(tw.muted, "mt-4")}>
          Demo accounts (password <b>demo</b>): <code>sunik.pay</code> ·{" "}
          <code>midas.pay</code>
        </p>
      </div>
    </div>
  );
}

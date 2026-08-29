"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudMark } from "@/components/CloudMark";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("sunik.pay");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError("");
    if (nextMode === "signup") {
      setHandle("");
      setPassword("");
    } else {
      setHandle("sunik.pay");
      setPassword("demo");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch(mode === "signup" ? "/api/signup" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { name, handle, password } : { handle, password },
        ),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        setError(data.reason ?? "Could not continue.");
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
          {mode === "signup" ? (
            <label className={tw.field}>
              Name
              <input
                className={tw.control}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          ) : null}
          <label className={cx(tw.field, mode === "signup" && "mt-3")}>
            Handle
            <input
              className={tw.control}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              placeholder="nina.pay"
            />
          </label>
          <label className={cx(tw.field, "mt-3")}>
            Password
            <input
              className={tw.control}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
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
            {pending
              ? mode === "signup"
                ? "Creating…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Log in"}
          </button>
        </form>
        <p className={cx(tw.muted, "mt-4")}>
          {mode === "login" ? (
            <>
              Demo accounts (password <b>demo</b>): <code>sunik.pay</code> ·{" "}
              <code>midas.pay</code>
              <button
                type="button"
                className={cx(tw.textBtn, "ml-1")}
                onClick={() => switchMode("signup")}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Starts with $50.00 fake money.{" "}
              <button
                type="button"
                className={tw.textBtn}
                onClick={() => switchMode("login")}
              >
                Log in instead
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { labSteps } from "@/data/wallets";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function Apis() {
  const { agents, apis, attemptPay } = useWallet();
  const [agentId, setAgentId] = useState(
    agents.find((a) => a.status === "active")?.id ?? agents[0]?.id ?? "",
  );
  const [apiId, setApiId] = useState(apis[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [denied, setDenied] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [verdict, setVerdict] = useState("");
  const [lastPaymentId, setLastPaymentId] = useState("");

  const agent = useMemo(
    () => agents.find((a) => a.id === agentId) ?? agents[0],
    [agents, agentId],
  );
  const api = useMemo(
    () => apis.find((a) => a.id === apiId) ?? apis[0],
    [apis, apiId],
  );

  async function fire() {
    if (running || !agent || !api) return;
    setRunning(true);
    setDenied(false);
    setStep(1);
    setLog([]);
    setVerdict("");
    setLastPaymentId("");

    const lines: string[] = [];
    const push = (line: string) => {
      lines.push(line);
      setLog([...lines]);
    };

    push(`POST /api/pay`);
    push(`as ${agent.handle} (browser session)`);
    push(`apiId=${api.id} · ${money(api.priceUsd)}`);
    setStep(2);
    const result = await attemptPay(agent.id, api.id);
    setStep(3);
    if (result.paymentId) setLastPaymentId(result.paymentId);
    if (!result.ok) {
      push(`← 402 ${result.reason}`);
      setDenied(true);
      setVerdict(result.reason);
      setRunning(false);
      return;
    }
    push(`← 200 settle · ${result.reason}`);
    setStep(4);
    setVerdict(result.reason);
    setRunning(false);
  }

  if (!agent || !api) return null;

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>APIs</h1>
      <p className={tw.sub}>
        Catalog prices for the demo. Pay is real on the ledger: session here, or{" "}
        <code className="font-mono text-[13px]">npm run agent:pay</code> with an{" "}
        <code className="font-mono text-[13px]">ak_</code> key. Nothing calls live
        OpenAI.
      </p>
      <div className={cx(tw.list, "mb-[22px]")}>
        {apis.map((item) => (
          <article key={item.id} className={tw.card}>
            <div className={tw.row}>
              <div>
                <h3 className={tw.name}>{item.name}</h3>
                <p className={tw.handle}>
                  {item.host}
                  {item.path}
                </p>
              </div>
              <b>{money(item.priceUsd)}</b>
            </div>
            <p className={cx(tw.muted, "mt-2")}>{item.description}</p>
          </article>
        ))}
      </div>
      <h2 className={tw.h2}>Pay lab</h2>
      <div className={tw.grid2}>
        <article className={tw.card}>
          <label className={tw.field}>
            Paying as
            <select
              className={tw.control}
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.handle} · {money(a.balanceUsd)}
                </option>
              ))}
            </select>
          </label>
          <label className={cx(tw.field, "mt-3")}>
            Catalog API
            <select
              className={tw.control}
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
            >
              {apis.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {money(item.priceUsd)}
                </option>
              ))}
            </select>
          </label>
          <p className={cx(tw.muted, "mt-2.5 mb-3.5")}>{api.description}</p>
          <button
            type="button"
            className={tw.btnPrimary}
            disabled={running}
            onClick={() => void fire()}
          >
            {running ? "Paying…" : "POST /api/pay"}
          </button>
          <pre className={tw.log}>
            {log.length ? log.join("\n") : "// waiting — or run npm run agent:pay"}
          </pre>
          {verdict ? (
            <p className={cx(denied ? tw.bad : tw.ok, "mt-2.5")}>
              {denied ? "Blocked" : "Settled"} · {verdict}
            </p>
          ) : null}
          {lastPaymentId ? (
            <Link
              href={`/payments/${lastPaymentId}`}
              className={cx(tw.textBtn, "mt-2 inline-block")}
            >
              View payment receipt →
            </Link>
          ) : null}
        </article>
        <ol className="m-0 grid list-none gap-2 p-0">
          {labSteps.map((s) => (
            <li
              key={s.id}
              className={cx(
                tw.card,
                denied && s.id >= 4 && "opacity-40",
                step === s.id && "border-brand",
              )}
            >
              <b className="text-brand">{s.id}</b> {s.label} — {s.detail}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

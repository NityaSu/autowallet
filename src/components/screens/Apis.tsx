"use client";

import { useMemo, useState } from "react";
import { labSteps } from "@/data/wallets";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    setStep(0);
    setLog([]);
    setVerdict("");

    const lines: string[] = [];
    const push = (line: string) => {
      lines.push(line);
      setLog([...lines]);
    };

    push(`GET https://${api.host}${api.path}`);
    setStep(1);
    await sleep(320);
    push(`← 402 PAYMENT-REQUIRED  ${money(api.priceUsd)}`);
    setStep(2);
    await sleep(360);
    push(`interceptor caught 402 · ${agent.handle}`);
    setStep(3);
    await sleep(300);
    const result = attemptPay(agent.id, api.id);
    setStep(4);
    push(result.ok ? `policy ALLOW · ${result.reason}` : `policy DENY · ${result.reason}`);
    await sleep(380);
    if (!result.ok) {
      setDenied(true);
      setVerdict(result.reason);
      setRunning(false);
      return;
    }
    push(`sign PAYMENT-SIGNATURE as ${agent.handle}`);
    setStep(5);
    await sleep(300);
    push("facilitator verify + settle (mock rail)");
    setStep(6);
    await sleep(340);
    push(`← 200 OK  ${api.payload}`);
    setStep(7);
    setVerdict(result.reason);
    setRunning(false);
  }

  if (!agent || !api) return null;

  return (
    <section className="aw-page">
      <h1 className="aw-h1">APIs</h1>
      <p className="aw-sub">
        Paid endpoints return HTTP 402. The agent pays only if policy allows it.
      </p>
      <div className="aw-list" style={{ marginBottom: 22 }}>
        {apis.map((item) => (
          <article key={item.id} className="aw-card">
            <div className="aw-row">
              <div>
                <h3 className="aw-name">{item.name}</h3>
                <p className="aw-handle">
                  {item.host}
                  {item.path}
                </p>
              </div>
              <b>{money(item.priceUsd)}</b>
            </div>
            <p className="aw-muted" style={{ margin: "8px 0 0" }}>
              {item.description}
            </p>
          </article>
        ))}
      </div>
      <h2 className="aw-h2">402 Lab</h2>
      <div className="aw-grid-2">
        <article className="aw-card">
          <label className="aw-field">
            Paying as
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.handle} · {money(a.balanceUsd)}
                </option>
              ))}
            </select>
          </label>
          <label className="aw-field" style={{ marginTop: 12 }}>
            Paid API
            <select value={apiId} onChange={(e) => setApiId(e.target.value)}>
              {apis.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {money(item.priceUsd)}
                </option>
              ))}
            </select>
          </label>
          <p className="aw-muted" style={{ margin: "10px 0 14px" }}>
            {api.description}
          </p>
          <button
            type="button"
            className="aw-btn primary"
            disabled={running}
            onClick={fire}
          >
            {running ? "Paying…" : "Fire request"}
          </button>
          <pre className="aw-log">
            {log.length ? log.join("\n") : "// waiting for a request"}
          </pre>
          {verdict ? (
            <p
              className={denied ? "bad" : "ok"}
              style={{ margin: "10px 0 0", fontWeight: 650 }}
            >
              {denied ? "Blocked" : step === 7 ? "Settled" : "Checking"} ·{" "}
              {verdict}
            </p>
          ) : null}
        </article>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {labSteps.map((s) => (
            <li
              key={s.id}
              className="aw-card"
              style={{
                opacity: denied && s.id >= 5 ? 0.4 : 1,
                borderColor: step === s.id ? "var(--orange)" : undefined,
              }}
            >
              <b style={{ color: "var(--orange)" }}>{s.id}</b> {s.label} —{" "}
              {s.detail}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

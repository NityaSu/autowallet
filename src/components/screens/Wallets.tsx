"use client";

import { Bot } from "lucide-react";
import { FormEvent, useState } from "react";
import { SpendBar } from "@/components/SpendBar";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

export function Wallets() {
  const { account, agents, issueAgent, fundAgent } = useWallet();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("New Agent");
  const [prefix, setPrefix] = useState("agent");
  const [cap, setCap] = useState(5);
  const [max, setMax] = useState(0.25);

  function create(e: FormEvent) {
    e.preventDefault();
    const next = issueAgent({
      name,
      prefix,
      dailyCapUsd: cap,
      perRequestMaxUsd: max,
    });
    if (next) setOpen(false);
  }

  return (
    <section className="aw-page">
      <div className="aw-row">
        <div>
          <h1 className="aw-h1">Wallets</h1>
          <p className="aw-sub">
            Master account funds virtual wallets that agents spend from.
          </p>
        </div>
        <button
          type="button"
          className="aw-btn primary"
          onClick={() => setOpen((v) => !v)}
        >
          Issue virtual wallet
        </button>
      </div>

      <article className="aw-card" style={{ marginBottom: 16 }}>
        <span className="aw-kicker">Account wallet</span>
        <strong
          style={{ display: "block", margin: "10px 0 4px", fontSize: 32 }}
        >
          {money(account.balanceUsd)}
        </strong>
        <p className="aw-muted">
          {account.handle} · {account.owner}
        </p>
      </article>

      {open ? (
        <form className="aw-issue aw-card" onSubmit={create}>
          <label className="aw-field">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              maxLength={32}
            />
          </label>
          <label className="aw-field">
            Handle
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              type="text"
              maxLength={20}
            />
          </label>
          <label className="aw-field">
            Daily cap
            <input
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              type="number"
              min={0.5}
              step={0.5}
            />
          </label>
          <label className="aw-field">
            Per request
            <input
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              type="number"
              min={0.01}
              step={0.01}
            />
          </label>
          <button type="submit" className="aw-btn primary">
            Create
          </button>
        </form>
      ) : null}

      <div className="aw-list">
        {agents.map((agent) => (
          <article key={agent.id} className="aw-card aw-agent">
            <div className="aw-agent-head">
              <div className="aw-who">
                <span className="aw-avatar">
                  <Bot size={18} />
                </span>
                <div>
                  <h3 className="aw-name">{agent.name}</h3>
                  <p className="aw-handle">{agent.handle}</p>
                </div>
              </div>
              <button
                type="button"
                className="aw-btn"
                onClick={() => fundAgent(agent.id, 10)}
              >
                Fund +$10
              </button>
            </div>
            <div className="aw-meta">
              <div>
                <span>Balance</span>
                <b>{money(agent.balanceUsd)}</b>
              </div>
              <div>
                <span>Daily limit</span>
                <b>{money(agent.dailyCapUsd)}</b>
              </div>
              <div>
                <span>Used today</span>
                <b>{money(agent.spentTodayUsd)}</b>
              </div>
            </div>
            <SpendBar spent={agent.spentTodayUsd} cap={agent.dailyCapUsd} />
          </article>
        ))}
      </div>
    </section>
  );
}

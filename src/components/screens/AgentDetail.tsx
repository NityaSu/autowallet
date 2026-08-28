"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { SpendBar } from "@/components/SpendBar";
import { WalletTicket } from "@/components/WalletTicket";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

export function AgentDetail({ agentId }: { agentId: string }) {
  const { agentById, paymentsFor, toggleAgent, fundAgent, account } =
    useWallet();
  const agent = agentById(agentId);
  const activity = agent ? paymentsFor(agent.id) : [];

  if (!agent) {
    return (
      <section className="aw-page">
        <Link href="/agents" className="aw-back">
          ← Agents
        </Link>
        <h1 className="aw-h1">Agent not found</h1>
      </section>
    );
  }

  return (
    <section className="aw-page">
      <Link href="/agents" className="aw-back">
        ← Agents / {agent.name}
      </Link>

      <div className="aw-agent-head" style={{ marginBottom: 18 }}>
        <div className="aw-who">
          <span className="aw-avatar">
            <Bot size={20} />
          </span>
          <div>
            <h1 className="aw-h1" style={{ margin: 0 }}>
              {agent.name}
            </h1>
            <p className="aw-handle">{agent.handle}</p>
          </div>
        </div>
        <span
          className={`aw-status${agent.status === "paused" ? " is-paused" : ""}`}
        >
          {agent.status === "active" ? "Active" : "Paused"}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <WalletTicket agent={agent} owner={account.owner} />
      </div>

      <div className="aw-grid-2">
        <article className="aw-card">
          <span className="aw-kicker">Wallet Balance</span>
          <strong
            style={{
              display: "block",
              margin: "14px 0 8px",
              fontSize: 36,
              letterSpacing: "-0.04em",
            }}
          >
            {money(agent.balanceUsd)}
          </strong>
          <p className="aw-muted">+ {money(agent.fundedUsd)} funded</p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="aw-btn primary"
              onClick={() => fundAgent(agent.id, 10)}
            >
              Fund +$10
            </button>
            <button
              type="button"
              className="aw-btn"
              onClick={() => toggleAgent(agent.id)}
            >
              {agent.status === "active" ? "Pause agent" : "Resume agent"}
            </button>
          </div>
        </article>

        <article className="aw-card">
          <span className="aw-kicker">Spending Policy</span>
          <div className="aw-meta" style={{ marginTop: 14 }}>
            <div>
              <span>Daily limit</span>
              <b>{money(agent.dailyCapUsd)}</b>
            </div>
            <div>
              <span>Per request</span>
              <b>{money(agent.perRequestMaxUsd)}</b>
            </div>
          </div>
          <p className="aw-kicker" style={{ marginTop: 18 }}>
            Allowed APIs
          </p>
          <ul className="aw-allow">
            {agent.allowlist.map((host) => (
              <li key={host}>{host}</li>
            ))}
          </ul>
          <Link href="/policies" className="aw-btn" style={{ marginTop: 14 }}>
            Edit policy →
          </Link>
        </article>
      </div>

      <div className="aw-card" style={{ marginTop: 14 }}>
        <SpendBar spent={agent.spentTodayUsd} cap={agent.dailyCapUsd} />
      </div>

      <h2 className="aw-h2">Payment Activity</h2>
      <ul className="aw-pay">
        {activity.map((tx) => (
          <li key={tx.id}>
            <span>
              {money(tx.amountUsd)} · {tx.apiName}
            </span>
            <span className="aw-muted">{tx.at}</span>
            <em className={tx.status === "settled" ? "ok" : "bad"}>
              {tx.status === "settled" ? "✓ Settled" : "✕ Blocked"}
            </em>
          </li>
        ))}
      </ul>
    </section>
  );
}

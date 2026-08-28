"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { SpendBar } from "@/components/SpendBar";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

export function Agents() {
  const router = useRouter();
  const { agents } = useWallet();

  return (
    <section className="aw-page">
      <h1 className="aw-h1">Agents</h1>
      <p className="aw-sub">Each agent is a virtual wallet with a human-readable handle.</p>
      <div className="aw-list">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className="aw-card aw-agent"
            style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
            onClick={() => router.push(`/agents/${agent.id}`)}
          >
            <div className="aw-agent-head">
              <div className="aw-who">
                <span className="aw-avatar">
                  <Bot size={18} />
                </span>
                <div>
                  <p className="aw-name">{agent.name}</p>
                  <p className="aw-handle">{agent.handle}</p>
                </div>
              </div>
              <span
                className={`aw-status${agent.status === "paused" ? " is-paused" : ""}`}
              >
                {agent.status === "active" ? "Active" : "Paused"}
              </span>
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
          </button>
        ))}
      </div>
    </section>
  );
}

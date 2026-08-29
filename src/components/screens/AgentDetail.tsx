"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { SpendBar } from "@/components/SpendBar";
import { WalletTicket } from "@/components/WalletTicket";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function AgentDetail({ agentId }: { agentId: string }) {
  const { agentById, paymentsFor, toggleAgent, fundAgent, account } =
    useWallet();
  const agent = agentById(agentId);
  const activity = agent ? paymentsFor(agent.id) : [];

  if (!agent) {
    return (
      <section className={tw.page}>
        <Link href="/agents" className={tw.back}>
          ← Agents
        </Link>
        <h1 className={tw.h1}>Agent not found</h1>
      </section>
    );
  }

  return (
    <section className={tw.page}>
      <Link href="/agents" className={tw.back}>
        ← Agents / {agent.name}
      </Link>

      <div className={cx(tw.agentHead, "mb-[18px]")}>
        <div className={tw.who}>
          <span className={tw.avatar}>
            <Bot size={20} />
          </span>
          <div>
            <h1 className={cx(tw.h1, "mb-0")}>{agent.name}</h1>
            <p className={tw.handle}>{agent.handle}</p>
          </div>
        </div>
        <span className={agent.status === "paused" ? tw.statusPaused : tw.statusOk}>
          {agent.status === "active" ? "Active" : "Paused"}
        </span>
      </div>

      <div className="mb-4">
        <WalletTicket agent={agent} owner={account.owner} />
      </div>

      <div className={tw.grid2}>
        <article className={tw.card}>
          <span className={tw.kicker}>Wallet Balance</span>
          <strong className="mt-3.5 mb-2 block text-4xl tracking-tight">
            {money(agent.balanceUsd)}
          </strong>
          <p className={tw.muted}>+ {money(agent.fundedUsd)} funded</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={tw.btnPrimary}
              onClick={() => fundAgent(agent.id, 10)}
            >
              Fund +$10
            </button>
            <button
              type="button"
              className={tw.btn}
              onClick={() => toggleAgent(agent.id)}
            >
              {agent.status === "active" ? "Pause agent" : "Resume agent"}
            </button>
          </div>
        </article>

        <article className={tw.card}>
          <span className={tw.kicker}>Spending Policy</span>
          <div className={cx(tw.meta, "mt-3.5")}>
            <div>
              <span className="block text-xs text-muted">Daily limit</span>
              <b className="text-[15px]">{money(agent.dailyCapUsd)}</b>
            </div>
            <div>
              <span className="block text-xs text-muted">Per request</span>
              <b className="text-[15px]">{money(agent.perRequestMaxUsd)}</b>
            </div>
          </div>
          <p className={cx(tw.kicker, "mt-[18px]")}>Allowed APIs</p>
          <ul className={tw.allow}>
            {agent.allowlist.map((host) => (
              <li key={host}>{host}</li>
            ))}
          </ul>
          <Link href="/policies" className={cx(tw.btn, "mt-3.5")}>
            Edit policy →
          </Link>
        </article>
      </div>

      <div className={cx(tw.card, "mt-3.5")}>
        <SpendBar spent={agent.spentTodayUsd} cap={agent.dailyCapUsd} />
      </div>

      <h2 className={tw.h2}>Payment Activity</h2>
      <ul className={tw.pay}>
        {activity.map((tx) => (
          <li key={tx.id} className={tw.payItem}>
            <span>
              {money(tx.amountUsd)} · {tx.apiName}
            </span>
            <span className={tw.muted}>{tx.at}</span>
            <em className={tx.status === "settled" ? tw.ok : tw.bad}>
              {tx.status === "settled" ? "✓ Settled" : "✕ Blocked"}
            </em>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { SpendBar } from "@/components/SpendBar";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function Agents() {
  const router = useRouter();
  const { agents } = useWallet();

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Agents</h1>
      <p className={tw.sub}>Each agent is a virtual wallet with a human-readable handle.</p>
      <div className={tw.list}>
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={cx(tw.card, tw.agent, "w-full cursor-pointer text-left")}
            onClick={() => router.push(`/agents/${agent.id}`)}
          >
            <div className={tw.agentHead}>
              <div className={tw.who}>
                <span className={tw.avatar}>
                  <Bot size={18} />
                </span>
                <div>
                  <p className={tw.name}>{agent.name}</p>
                  <p className={tw.handle}>{agent.handle}</p>
                </div>
              </div>
              <span
                className={
                  agent.status === "paused" ? tw.statusPaused : tw.statusOk
                }
              >
                {agent.status === "active" ? "Active" : "Paused"}
              </span>
            </div>
            <div className={tw.meta}>
              <div>
                <span className="block text-xs text-muted">Balance</span>
                <b className="text-[15px]">{money(agent.balanceUsd)}</b>
              </div>
              <div>
                <span className="block text-xs text-muted">Daily limit</span>
                <b className="text-[15px]">{money(agent.dailyCapUsd)}</b>
              </div>
              <div>
                <span className="block text-xs text-muted">Used today</span>
                <b className="text-[15px]">{money(agent.spentTodayUsd)}</b>
              </div>
            </div>
            <SpendBar spent={agent.spentTodayUsd} cap={agent.dailyCapUsd} />
          </button>
        ))}
      </div>
    </section>
  );
}

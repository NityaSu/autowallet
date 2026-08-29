"use client";

import { Bot } from "lucide-react";
import { FormEvent, useState } from "react";
import { SpendBar } from "@/components/SpendBar";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

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
    <section className={tw.page}>
      <div className={tw.row}>
        <div>
          <h1 className={tw.h1}>Wallets</h1>
          <p className={tw.sub}>
            Master account funds virtual wallets that agents spend from.
          </p>
        </div>
        <button
          type="button"
          className={tw.btnPrimary}
          onClick={() => setOpen((v) => !v)}
        >
          Issue virtual wallet
        </button>
      </div>

      <article className={cx(tw.card, "mb-4")}>
        <span className={tw.kicker}>Account wallet</span>
        <strong className="mt-2.5 mb-1 block text-[32px]">
          {money(account.balanceUsd)}
        </strong>
        <p className={tw.muted}>
          {account.handle} · {account.owner}
        </p>
      </article>

      {open ? (
        <form
          className={cx(
            tw.card,
            "mb-4 grid grid-cols-1 items-end gap-2.5 lg:grid-cols-[1.3fr_1fr_0.7fr_0.7fr_auto]",
          )}
          onSubmit={create}
        >
          <label className={tw.field}>
            Name
            <input
              className={tw.control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              maxLength={32}
            />
          </label>
          <label className={tw.field}>
            Handle
            <input
              className={tw.control}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              type="text"
              maxLength={20}
            />
          </label>
          <label className={tw.field}>
            Daily cap
            <input
              className={tw.control}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              type="number"
              min={0.5}
              step={0.5}
            />
          </label>
          <label className={tw.field}>
            Per request
            <input
              className={tw.control}
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              type="number"
              min={0.01}
              step={0.01}
            />
          </label>
          <button type="submit" className={tw.btnPrimary}>
            Create
          </button>
        </form>
      ) : null}

      <div className={tw.list}>
        {agents.map((agent) => (
          <article key={agent.id} className={cx(tw.card, tw.agent)}>
            <div className={tw.agentHead}>
              <div className={tw.who}>
                <span className={tw.avatar}>
                  <Bot size={18} />
                </span>
                <div>
                  <h3 className={tw.name}>{agent.name}</h3>
                  <p className={tw.handle}>{agent.handle}</p>
                </div>
              </div>
              <button
                type="button"
                className={tw.btn}
                onClick={() => fundAgent(agent.id, 10)}
              >
                Fund +$10
              </button>
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
          </article>
        ))}
      </div>
    </section>
  );
}

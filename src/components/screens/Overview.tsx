"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BookOpen,
  Bot,
  FileText,
  Shield,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SpendBar } from "@/components/SpendBar";
import { WalletTicket } from "@/components/WalletTicket";
import { useWallet } from "@/context/WalletProvider";
import { greeting, money } from "@/lib/money";

export function Overview() {
  const router = useRouter();
  const { account, agents, payments } = useWallet();
  const [hello, setHello] = useState("Good afternoon");

  useEffect(() => {
    setHello(greeting());
  }, []);

  const featured = agents.find((a) => a.id === "research") ?? agents[0];
  const recent = payments.slice(0, 6);
  const successRate = useMemo(() => {
    if (!payments.length) return 100;
    const ok = payments.filter((p) => p.status === "settled").length;
    return Math.round((ok / payments.length) * 1000) / 10;
  }, [payments]);

  const spendSlices = useMemo(() => {
    const settled = payments.filter((p) => p.status === "settled");
    const total = settled.reduce((s, p) => s + p.amountUsd, 0) || 1;
    const api = settled
      .filter((p) => p.apiName === "Search API" || p.apiName === "LLM API")
      .reduce((s, p) => s + p.amountUsd, 0);
    const data = settled
      .filter((p) => p.apiName === "Data API")
      .reduce((s, p) => s + p.amountUsd, 0);
    const other = Math.max(0, total - api - data);
    return [
      { label: "API Calls", pct: Math.round((api / total) * 100), color: "#fc6203" },
      { label: "Data Services", pct: Math.round((data / total) * 100), color: "#f4b183" },
      { label: "Other", pct: Math.round((other / total) * 100), color: "#fde0c3" },
    ];
  }, [payments]);

  const donut = useMemo(() => {
    const [a, b] = spendSlices;
    const aEnd = a?.pct ?? 0;
    const bEnd = aEnd + (b?.pct ?? 0);
    return `conic-gradient(#fc6203 0 ${aEnd}%, #f4a574 ${aEnd}% ${bEnd}%, #fde0c3 ${bEnd}% 100%)`;
  }, [spendSlices]);

  function agentName(id: string) {
    return agents.find((a) => a.id === id)?.name ?? "Agent";
  }

  if (!featured) return null;

  return (
    <section>
      <div className="aw-ov-head">
        <div>
          <h1 className="aw-hello">
            {hello}, {account.firstName} !
          </h1>
          <p className="aw-sub">Here&apos;s what&apos;s happening with AutoWallet today.</p>
        </div>
        <button
          type="button"
          className="aw-btn primary aw-ov-cta"
          onClick={() => router.push("/send")}
        >
          <ArrowLeftRight size={16} />
          Send money
        </button>
      </div>

      <div className="aw-ov-stats">
        <article className="aw-ov-stat">
          <div>
            <span>Total Balance</span>
            <strong className="is-orange">{money(account.balanceUsd)}</strong>
            <em>Available to send</em>
          </div>
          <i className="aw-ov-ico">
            <Wallet size={18} />
          </i>
        </article>
        <article className="aw-ov-stat">
          <div>
            <span>Spent Today</span>
            <strong className="is-orange">{money(account.spentUsd)}</strong>
            <em className="is-up">
              <TrendingUp size={12} /> +18.6% vs yesterday
            </em>
          </div>
          <i className="aw-ov-ico">
            <TrendingUp size={18} />
          </i>
        </article>
        <article className="aw-ov-stat">
          <div>
            <span>Total Payments</span>
            <strong>{account.requests.toLocaleString()}</strong>
            <em>Across all agents</em>
          </div>
          <i className="aw-ov-ico">
            <Target size={18} />
          </i>
        </article>
        <article className="aw-ov-stat">
          <div>
            <span>Successful Rate</span>
            <strong className="is-orange">{successRate}%</strong>
            <em className="is-up">
              <TrendingUp size={12} /> +2.1% vs last week
            </em>
          </div>
          <i className="aw-ov-ico is-ok">
            <Shield size={18} />
          </i>
        </article>
      </div>

      <div className="aw-ov-mid">
        <article className="aw-card">
          <div className="aw-ov-card-head">
            <h2>Agent Wallets</h2>
            <button
              type="button"
              className="aw-text-btn"
              onClick={() => router.push("/agents")}
            >
              View all
            </button>
          </div>
          {agents.map((agent) => (
            <div className="aw-ov-agent-row" key={agent.id}>
              <span className="aw-avatar">
                <Bot size={16} />
              </span>
              <div className="aw-ov-agent-id">
                <strong>{agent.name}</strong>
                <p className="aw-handle">{agent.handle}</p>
              </div>
              <div className="aw-ov-agent-num">
                <span>Balance</span>
                <b>{money(agent.balanceUsd)}</b>
              </div>
              <div className="aw-ov-agent-num">
                <span>Daily limit</span>
                <b>{money(agent.dailyCapUsd)}</b>
              </div>
              <SpendBar
                compact
                showAmount={false}
                spent={agent.spentTodayUsd}
                cap={agent.dailyCapUsd}
              />
            </div>
          ))}
        </article>

        <WalletTicket
          agent={featured}
          owner={account.owner}
          onManage={() => router.push(`/agents/${featured.id}`)}
        />
      </div>

      <div className="aw-ov-bot">
        <article className="aw-card">
          <div className="aw-ov-card-head">
            <h2>Recent Payment Activity</h2>
            <button
              type="button"
              className="aw-text-btn"
              onClick={() => router.push("/activity")}
            >
              View all
            </button>
          </div>
          <table className="aw-ov-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Agent</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((tx) => (
                <tr key={tx.id}>
                  <td className="aw-muted">{tx.at}</td>
                  <td>{agentName(tx.agentId)}</td>
                  <td className="aw-handle">{tx.host}</td>
                  <td>{money(tx.amountUsd)}</td>
                  <td>
                    <em
                      className={
                        tx.status === "settled" ? "aw-pill ok" : "aw-pill bad"
                      }
                    >
                      {tx.status === "settled" ? "Settled" : "Blocked"}
                    </em>
                  </td>
                  <td className="aw-muted">x402 / USDC</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <div className="aw-ov-side">
          <article className="aw-card">
            <h2>Today&apos;s Spending</h2>
            <div className="aw-ov-donut-wrap">
              <div className="aw-ov-donut" style={{ background: donut }}>
                <div className="aw-ov-donut-hole">
                  <b>{money(featured.spentTodayUsd)}</b>
                  <span>of {money(featured.dailyCapUsd)}</span>
                </div>
              </div>
              <ul>
                {spendSlices.map((slice) => (
                  <li key={slice.label}>
                    <i style={{ background: slice.color }} />
                    {slice.label}
                    <em>{slice.pct}%</em>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="aw-card">
            <h2>Quick Actions</h2>
            <div className="aw-ov-actions">
              <button type="button" onClick={() => router.push("/wallets")}>
                <Wallet size={18} />
                Add Funds
              </button>
              <button type="button" onClick={() => router.push("/wallets")}>
                <Bot size={18} />
                Create Agent
              </button>
              <button type="button" onClick={() => router.push("/policies")}>
                <FileText size={18} />
                New Policy
              </button>
              <button type="button" onClick={() => router.push("/settings")}>
                <BookOpen size={18} />
                View Docs
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

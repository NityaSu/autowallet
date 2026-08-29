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
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SpendBar } from "@/components/SpendBar";
import { WalletTicket } from "@/components/WalletTicket";
import { useWallet } from "@/context/WalletProvider";
import { formatTxTime, greeting, money } from "@/lib/money";
import { overviewFromTransfers } from "@/lib/transfer-stats";

export function Overview() {
  const router = useRouter();
  const { account, agents, transfers } = useWallet();
  const [hello, setHello] = useState("Good afternoon");

  useEffect(() => {
    setHello(greeting());
  }, []);

  const featured = agents.find((a) => a.id === "research") ?? agents[0];
  const stats = useMemo(
    () => overviewFromTransfers(transfers, account.handle),
    [transfers, account.handle],
  );
  const recent = transfers.slice(0, 6);
  const donut =
    stats.volumeToday <= 0
      ? "conic-gradient(#f3f4f6 0 100%)"
      : `conic-gradient(#fc6203 0 ${stats.sentPct}%, #fde0c3 ${stats.sentPct}% 100%)`;
  const spendSlices = [
    { label: "Sent", pct: stats.sentPct, color: "#fc6203" },
    { label: "Received", pct: stats.receivedPct, color: "#fde0c3" },
  ];

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
            <strong className="is-orange">{money(stats.spentToday)}</strong>
            {stats.spentDeltaPct === null ? (
              <em>
                {stats.spentToday > 0 ? "Outgoing today" : "No outgoing sends"}
              </em>
            ) : (
              <em className={stats.spentDeltaPct >= 0 ? "is-up" : "is-down"}>
                {stats.spentDeltaPct >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {stats.spentDeltaPct >= 0 ? "+" : ""}
                {stats.spentDeltaPct}% vs yesterday
              </em>
            )}
          </div>
          <i className="aw-ov-ico">
            <TrendingUp size={18} />
          </i>
        </article>
        <article className="aw-ov-stat">
          <div>
            <span>Total Payments</span>
            <strong>{stats.totalPayments.toLocaleString()}</strong>
            <em>P2P sends</em>
          </div>
          <i className="aw-ov-ico">
            <Target size={18} />
          </i>
        </article>
        <article className="aw-ov-stat">
          <div>
            <span>Successful Rate</span>
            <strong className="is-orange">{stats.successRate}%</strong>
            <em>
              {stats.totalPayments === 0
                ? "No sends yet"
                : "Settled P2P transfers"}
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
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Memo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td className="aw-muted" colSpan={6}>
                    No person-to-person sends yet.
                  </td>
                </tr>
              ) : (
                recent.map((tx) => {
                  const settled = (tx.status ?? "settled") === "settled";
                  return (
                    <tr key={tx.id}>
                      <td className="aw-muted">{formatTxTime(tx.at)}</td>
                      <td className="aw-handle">{tx.fromHandle}</td>
                      <td className="aw-handle">{tx.toHandle}</td>
                      <td>{money(tx.amountUsd)}</td>
                      <td className="aw-muted">{tx.memo}</td>
                      <td>
                        <em className={settled ? "aw-pill ok" : "aw-pill bad"}>
                          {settled ? "Settled" : "Blocked"}
                        </em>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </article>

        <div className="aw-ov-side">
          <article className="aw-card">
            <h2>Today&apos;s activity</h2>
            <div className="aw-ov-donut-wrap">
              <div className="aw-ov-donut" style={{ background: donut }}>
                <div className="aw-ov-donut-hole">
                  <b>{money(stats.volumeToday)}</b>
                  <span>sent + received</span>
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

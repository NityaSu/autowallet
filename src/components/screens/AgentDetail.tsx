"use client";

import { Bot, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SpendBar } from "@/components/SpendBar";
import { WalletTicket } from "@/components/WalletTicket";
import { useWallet } from "@/context/WalletProvider";
import type { AuditEntry, Pagination } from "@/data/wallets";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

function toInputDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function AgentDetail({ agentId }: { agentId: string }) {
  const { agentById, paymentsFor, toggleAgent, fundAgent, account, fetchAudit } =
    useWallet();
  const agent = agentById(agentId);
  const activity = agent ? paymentsFor(agent.id) : [];

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toInputDate(d);
  });
  const [to, setTo] = useState(() => toInputDate());
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const loadAudit = async (page = 1) => {
    if (!agent) return;
    setLoading(true);
    setAuditError("");
    try {
      const result = await fetchAudit(agent.id, { from, to }, { page, limit: 20 });
      setAudit(result.payments);
      setPagination(result.pagination);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const settled = audit.filter((e) => e.status === "settled");
    const blocked = audit.filter((e) => e.status === "blocked");
    const total = settled.reduce((sum, e) => sum + e.amountUsd, 0);
    return {
      count: pagination?.total ?? audit.length,
      settledCount: settled.length,
      blockedCount: blocked.length,
      total,
    };
  }, [audit, pagination]);

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
        <WalletTicket
          owner={account.owner}
          handle={agent.handle}
          balanceUsd={agent.balanceUsd}
          spentTodayUsd={agent.spentTodayUsd}
          receivedTodayUsd={0}
          live={agent.status === "active"}
        />
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
              onClick={() => void fundAgent(agent.id, 10)}
            >
              Fund +$10
            </button>
            <button
              type="button"
              className={tw.btn}
              onClick={() => void toggleAgent(agent.id)}
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
        {activity.length === 0 ? (
          <li className={cx(tw.muted, tw.payItem)}>No agent payments yet.</li>
        ) : (
          activity.map((tx) => (
            <li key={tx.id} className={tw.payItem}>
              <span>
                {money(tx.amountUsd)} · {tx.apiName}
              </span>
              <span className={tw.muted}>{tx.at}</span>
              <em className={tx.status === "settled" ? tw.ok : tw.bad}>
                {tx.status === "settled" ? "✓ Settled" : "✕ Blocked"}
              </em>
              <Link href={`/payments/${tx.id}`} className={tw.textBtn}>
                Receipt
              </Link>
            </li>
          ))
        )}
      </ul>

      <h2 className={tw.h2}>Audit</h2>
      <article className={tw.card}>
        <div className="flex flex-wrap items-end gap-3">
          <label className={tw.field}>
            <span>From</span>
            <input
              type="date"
              className={tw.control}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className={tw.field}>
            <span>To</span>
            <input
              type="date"
              className={tw.control}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={tw.btnPrimary}
            onClick={() => void loadAudit(1)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load audit"}
          </button>
          <a
            href={`/api/agents/${agent.id}/audit/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
            download={`${agent.handle}-audit.csv`}
            className={tw.btn}
          >
            <Download size={16} />
            Export CSV
          </a>
        </div>

        {auditError ? (
          <p className={cx(tw.bad, "mt-4")}>{auditError}</p>
        ) : null}

        <div className={cx(tw.stats, "mt-5")}>
          <div className={tw.stat}>
            <span className="text-xs text-muted">Total payments</span>
            <b className="text-[15px]">{summary.count}</b>
          </div>
          <div className={tw.stat}>
            <span className="text-xs text-muted">Settled (page)</span>
            <b className="text-[15px]">{summary.settledCount}</b>
          </div>
          <div className={tw.stat}>
            <span className="text-xs text-muted">Blocked (page)</span>
            <b className="text-[15px]">{summary.blockedCount}</b>
          </div>
          <div className={tw.stat}>
            <span className="text-xs text-muted">Spent (page)</span>
            <b className="text-[15px]">{money(summary.total)}</b>
          </div>
        </div>

        {audit.length === 0 ? (
          <p className={cx(tw.muted, "mt-5")}>
            No agent payments in this date range.
          </p>
        ) : (
          <>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="bg-soft text-left text-xs font-semibold text-muted">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">API</th>
                    <th className="px-4 py-3">Host</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-line first:border-t-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(entry.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </td>
                      <td className="px-4 py-3">{entry.apiName}</td>
                      <td className="px-4 py-3 font-mono text-xs">{entry.host}</td>
                      <td className={cx(tw.amt, "px-4 py-3")}>
                        {money(entry.amountUsd)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            entry.status === "settled" ? tw.pillOk : tw.pillBad
                          }
                        >
                          {entry.status === "settled" ? "Settled" : "Blocked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={tw.btn}
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => void loadAudit(pagination.page - 1)}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>
                  <button
                    type="button"
                    className={tw.btn}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => void loadAudit(pagination.page + 1)}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </article>
    </section>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { CopyHandle } from "@/components/CopyHandle";
import { WalletTicket } from "@/components/WalletTicket";
import { useWallet } from "@/context/WalletProvider";
import { formatTxTime, greeting, money } from "@/lib/money";
import { overviewFromTransfers } from "@/lib/transfer-stats";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function Overview() {
  const router = useRouter();
  const { account, people, transfers, you } = useWallet();
  const hello = greeting();

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

  return (
    <section className="min-w-0">
      <div className="mb-[22px] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={tw.hello}>
            {hello}, {account.firstName} !
          </h1>
          <p className={tw.sub}>Here&apos;s what&apos;s happening with AutoWallet today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyHandle
            handle={account.handle}
            className="h-[42px] rounded-xl px-4"
          />
          <button
            type="button"
            className={cx(tw.btnPrimary, "h-[42px] rounded-xl px-4")}
            onClick={() => router.push("/send")}
          >
            <ArrowLeftRight size={16} />
            Send money
          </button>
        </div>
      </div>

      <div className={tw.stats}>
        <article className={tw.stat}>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-muted">
              Total Balance
            </span>
            <strong className="mt-2 mb-1.5 block text-[20px] tracking-tight text-brand sm:text-[26px]">
              {money(account.balanceUsd)}
            </strong>
            <em className="text-xs not-italic text-muted">Available to send</em>
          </div>
          <i className={cx(tw.ovIco, "hidden sm:grid")}>
            <Wallet size={18} />
          </i>
        </article>
        <article className={tw.stat}>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-muted">
              Spent Today
            </span>
            <strong className="mt-2 mb-1.5 block text-[20px] tracking-tight text-brand sm:text-[26px]">
              {money(stats.spentToday)}
            </strong>
            {stats.spentDeltaPct === null ? (
              <em className="text-xs not-italic text-muted">
                {stats.spentToday > 0 ? "Outgoing today" : "No outgoing sends"}
              </em>
            ) : (
              <em
                className={cx(
                  "inline-flex items-center gap-1 text-xs not-italic",
                  stats.spentDeltaPct >= 0 ? "text-ok" : "text-bad",
                )}
              >
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
          <i className={cx(tw.ovIco, "hidden sm:grid")}>
            <TrendingUp size={18} />
          </i>
        </article>
        <article className={tw.stat}>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-muted">
              Total Payments
            </span>
            <strong className="mt-2 mb-1.5 block text-[20px] tracking-tight sm:text-[26px]">
              {stats.totalPayments.toLocaleString()}
            </strong>
            <em className="text-xs not-italic text-muted">P2P sends</em>
          </div>
          <i className={cx(tw.ovIco, "hidden sm:grid")}>
            <Target size={18} />
          </i>
        </article>
        <article className={tw.stat}>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-muted">
              Successful Rate
            </span>
            <strong className="mt-2 mb-1.5 block text-[20px] tracking-tight text-brand sm:text-[26px]">
              {stats.successRate}%
            </strong>
            <em className="text-xs not-italic text-muted">
              {stats.totalPayments === 0
                ? "No sends yet"
                : "Settled P2P transfers"}
            </em>
          </div>
          <i className={cx(tw.ovIcoOk, "hidden sm:grid")}>
            <Shield size={18} />
          </i>
        </article>
      </div>

      <div className={tw.ovSplit}>
        <article className={tw.card}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m-0 text-base font-semibold">People</h2>
          </div>
          {people.length === 0 ? (
            <p className={cx(tw.muted, "mb-0 border-t border-line pt-3 text-sm")}>
              No one yet. Copy your handle so someone can send to you.
            </p>
          ) : (
            people.map((person) => (
              <Link
                href={`/send?to=${encodeURIComponent(person.handle)}`}
                className="grid grid-cols-1 items-center gap-3 border-t border-line py-3 text-foreground no-underline sm:grid-cols-[1fr_auto]"
                key={person.id}
              >
                <div>
                  <strong className="block text-sm">{person.name}</strong>
                  <p className={tw.handle}>{person.handle}</p>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">Handle</span>
                  <b className="font-mono text-sm">{person.handle}</b>
                </div>
              </Link>
            ))
          )}
        </article>

        <div>
          <WalletTicket
            owner={account.owner}
            handle={account.handle}
            balanceUsd={account.balanceUsd}
            spentTodayUsd={stats.spentToday}
            receivedTodayUsd={stats.receivedToday}
            live={!you.locked}
            onManage={() => router.push("/send")}
          />
        </div>
      </div>

      <div className={tw.ovSplit}>
        <article className={tw.card}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="m-0 min-w-0 text-base font-semibold">
              Recent activity
            </h2>
            <button
              type="button"
              className={cx(tw.textBtn, "shrink-0")}
              onClick={() => router.push("/activity")}
            >
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <p className={cx(tw.muted, "mb-0 border-t border-line pt-3")}>
              No person-to-person sends yet.
            </p>
          ) : (
            <>
              <ul className={cx(tw.pay, "border-0 shadow-none md:hidden")}>
                {recent.map((tx) => {
                  const settled = (tx.status ?? "settled") === "settled";
                  return (
                    <li key={tx.id} className={tw.payItem}>
                      <Link
                        href={`/activity/${tx.id}`}
                        className="contents text-foreground no-underline"
                      >
                        <span className="min-w-0">
                          <span className="break-all font-mono text-[13px]">
                            {tx.fromHandle} → {tx.toHandle}
                          </span>
                          <span className={cx(tw.muted, "block text-xs")}>
                            {tx.memo} · {formatTxTime(tx.at)}
                          </span>
                        </span>
                        <b className={tw.amt}>{money(tx.amountUsd)}</b>
                        <em className={settled ? tw.ok : tw.bad}>
                          {settled ? "✓ Settled" : "✕ Blocked"}
                        </em>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {["Time", "From", "To", "Amount", "Memo", "Status", "Receipt"].map(
                        (h) => (
                          <th
                            key={h}
                            className="pr-2 pb-2.5 text-left text-[11px] font-semibold whitespace-nowrap text-muted"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((tx) => {
                      const settled = (tx.status ?? "settled") === "settled";
                      return (
                        <tr key={tx.id}>
                          <td
                            className={cx(
                              tw.muted,
                              "border-t border-line py-2.5 pr-2 whitespace-nowrap",
                            )}
                          >
                            {formatTxTime(tx.at)}
                          </td>
                          <td className="border-t border-line py-2.5 pr-2 font-mono text-[13px] whitespace-nowrap text-muted">
                            {tx.fromHandle}
                          </td>
                          <td className="border-t border-line py-2.5 pr-2 font-mono text-[13px] whitespace-nowrap text-muted">
                            {tx.toHandle}
                          </td>
                          <td className="border-t border-line py-2.5 pr-2 whitespace-nowrap">
                            {money(tx.amountUsd)}
                          </td>
                          <td
                            className={cx(
                              tw.muted,
                              "border-t border-line py-2.5 pr-2",
                            )}
                          >
                            {tx.memo}
                          </td>
                          <td className="border-t border-line py-2.5 pr-2">
                            <em className={settled ? tw.pillOk : tw.pillBad}>
                              {settled ? "Settled" : "Blocked"}
                            </em>
                          </td>
                          <td className="border-t border-line py-2.5 pr-2 whitespace-nowrap">
                            <Link
                              href={`/activity/${tx.id}`}
                              className={tw.textBtn}
                            >
                              Receipt
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>

        <div className="grid gap-3.5">
          <article className={tw.card}>
            <h2 className="mb-3 text-base font-semibold">Today&apos;s activity</h2>
            <div className="flex items-center gap-4">
              <div
                className="grid size-28 shrink-0 place-items-center rounded-full"
                style={{ background: donut }}
              >
                <div className="grid size-[76px] place-items-center rounded-full bg-white text-center">
                  <b className="text-[13px]">{money(stats.volumeToday)}</b>
                  <span className="block text-[10px] text-muted">
                    sent + received
                  </span>
                </div>
              </div>
              <ul className="m-0 list-none p-0 text-[13px]">
                {spendSlices.map((slice) => (
                  <li key={slice.label} className="my-1.5 flex items-center gap-2">
                    <i
                      className="size-2 rounded-full"
                      style={{ background: slice.color }}
                    />
                    {slice.label}
                    <em className="ml-auto not-italic text-muted">{slice.pct}%</em>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className={tw.card}>
            <h2 className="mb-3 text-base font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { href: "/send", icon: ArrowLeftRight, label: "Send money" },
                  { href: "/activity", icon: Activity, label: "Activity" },
                  { href: "/settings", icon: BookOpen, label: "Settings" },
                ] as const
              ).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-line bg-[#f8f9fb] px-2 py-3.5 font-sans text-xs font-semibold text-foreground"
                  onClick={() => router.push(action.href)}
                >
                  <action.icon size={18} className="text-brand" />
                  {action.label}
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

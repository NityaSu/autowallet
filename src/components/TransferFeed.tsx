"use client";

import Link from "next/link";
import type { Transfer } from "@/data/wallets";
import { formatTxTime, groupByLocalDay, money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

type Party = { name: string; handle: string };

function fallbackName(handle: string) {
  return handle
    .replace(/\.pay$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function partyFor(handle: string, directory: Party[]): Party {
  const found = directory.find((p) => p.handle === handle);
  if (found) return found;
  return { name: fallbackName(handle), handle };
}

export function TransferFeed({
  transfers,
  you,
  people,
  agents = [],
  empty = "No transfers yet.",
  framed = true,
  className,
}: {
  transfers: Transfer[];
  you: Party;
  people: Party[];
  agents?: Party[];
  empty?: string;
  framed?: boolean;
  className?: string;
}) {
  const directory = [you, ...people, ...agents];
  const groups = groupByLocalDay(transfers);

  if (transfers.length === 0) {
    return <p className={cx(tw.muted, framed && "mt-0")}>{empty}</p>;
  }

  return (
    <ul
      className={cx(framed ? tw.pay : "m-0 list-none p-0", className)}
    >
      {groups.map((group) => (
        <li key={group.heading} className="list-none">
          <p className="m-0 border-b border-line bg-[#fafbfc] px-[18px] py-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
            {group.heading}
          </p>
          <ul className="m-0 list-none p-0">
            {group.items.map((tx) => {
              const outgoing = tx.fromHandle === you.handle;
              const other = partyFor(
                outgoing ? tx.toHandle : tx.fromHandle,
                directory,
              );
              const settled = (tx.status ?? "settled") === "settled";
              const line = [tx.memo, outgoing ? `To ${other.handle}` : `From ${other.handle}`]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={tx.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={`/activity/${tx.id}`}
                    className="flex items-center gap-3 px-[18px] py-3.5 text-foreground no-underline hover:bg-soft"
                  >
                    <span className={tw.avatar} aria-hidden>
                      {initials(other.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {other.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {line}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatTxTime(tx.at)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <b
                        className={cx(
                          tw.amt,
                          "text-[15px]",
                          outgoing ? "text-foreground" : "text-ok",
                        )}
                      >
                        {outgoing ? "−" : "+"}
                        {money(tx.amountUsd)}
                      </b>
                      {settled ? null : (
                        <em className={cx(tw.bad, "mt-1 block")}>Blocked</em>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

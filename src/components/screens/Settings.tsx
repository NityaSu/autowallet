"use client";

import { useWallet } from "@/context/WalletProvider";
import * as tw from "@/lib/tw";

export function Settings() {
  const { you } = useWallet();

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Settings</h1>
      <p className={tw.sub}>Account identity for this personal PoC.</p>
      <article className={tw.card}>
        <div className={tw.meta}>
          <div>
            <span className="block text-xs text-muted">Owner</span>
            <b className="text-[15px]">{you.name}</b>
          </div>
          <div>
            <span className="block text-xs text-muted">Handle</span>
            <b className="text-[15px]">{you.handle}</b>
          </div>
          <div>
            <span className="block text-xs text-muted">Rail</span>
            <b className="text-[15px]">Fake USD on Postgres</b>
          </div>
        </div>
      </article>
      <p className={tw.note}>
        AutoWallet is a portfolio demo. Person-to-person send is a real
        Postgres ledger with fake money. Agent screens are still in-memory
        mocks.
      </p>
    </section>
  );
}

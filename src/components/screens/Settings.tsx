"use client";

import { useWallet } from "@/context/WalletProvider";

export function Settings() {
  const { you } = useWallet();

  return (
    <section className="aw-page">
      <h1 className="aw-h1">Settings</h1>
      <p className="aw-sub">Account identity for this personal PoC.</p>
      <article className="aw-card">
        <div className="aw-meta">
          <div>
            <span>Owner</span>
            <b>{you.name}</b>
          </div>
          <div>
            <span>Handle</span>
            <b>{you.handle}</b>
          </div>
          <div>
            <span>Rail</span>
            <b>Fake USD on Postgres</b>
          </div>
        </div>
      </article>
      <p className="aw-note">
        AutoWallet is a portfolio demo. Person-to-person send is a real
        Postgres ledger with fake money. Agent screens are still in-memory
        mocks.
      </p>
    </section>
  );
}

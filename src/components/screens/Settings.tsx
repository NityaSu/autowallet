"use client";

import { useWallet } from "@/context/WalletProvider";

export function Settings() {
  const { account } = useWallet();

  return (
    <section className="aw-page">
      <h1 className="aw-h1">Settings</h1>
      <p className="aw-sub">Account identity for this personal PoC.</p>
      <article className="aw-card">
        <div className="aw-meta">
          <div>
            <span>Owner</span>
            <b>{account.owner}</b>
          </div>
          <div>
            <span>Handle</span>
            <b>{account.handle}</b>
          </div>
          <div>
            <span>Rail</span>
            <b>USDC mock</b>
          </div>
        </div>
      </article>
      <p className="aw-note">
        AutoWallet is frontend-first. Send and spend update mock balances in
        the browser. A Postgres ledger comes later.
      </p>
    </section>
  );
}

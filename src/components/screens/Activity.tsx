"use client";

import { TransferFeed } from "@/components/TransferFeed";
import { useWallet } from "@/context/WalletProvider";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

export function Activity() {
  const { agents, people, transfers, you } = useWallet();

  return (
    <section className={tw.page}>
      <h1 className={tw.h1}>Activity</h1>
      <p className={cx(tw.sub, "mb-5")}>Sends and receives in your wallet.</p>
      <TransferFeed
        transfers={transfers}
        you={you}
        people={people}
        agents={agents}
        empty="No person-to-person sends yet."
      />
    </section>
  );
}

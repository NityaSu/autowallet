"use client";

import { PayQr } from "@/components/PayQr";
import { money, splitName } from "@/lib/money";
import styles from "./WalletTicket.module.css";

function atHandle(handle: string) {
  return `@${handle.replace(/\.pay$/i, "")}`;
}

export function WalletTicket({
  owner,
  handle,
  balanceUsd,
  spentTodayUsd,
  receivedTodayUsd,
  live = true,
  onManage,
  kind = "personal",
}: {
  owner: string;
  handle: string;
  balanceUsd: number;
  spentTodayUsd: number;
  receivedTodayUsd: number;
  live?: boolean;
  onManage?: () => void;
  kind?: "personal" | "agent";
}) {
  if (kind === "agent") {
    return (
      <div className={styles.agentWrapper}>
        <article
          className={`${styles.agentCard} ${live ? "" : styles.agentCardPaused}`}
        >
          <div className={styles.agentBg} aria-hidden />
          <div className={styles.agentEnergy} aria-hidden />
          <div className={styles.agentSheen} aria-hidden />

          <div className={styles.agentHeader}>
            <span className={styles.agentCloud} aria-hidden />
            <span className={styles.agentBrand}>AUTOWALLET</span>
          </div>

          <div className={styles.agentName}>{atHandle(handle)}</div>

          <div className={styles.agentFooter}>
            <div className={styles.agentFooterCol}>
              <span className={styles.agentFooterLabel}>Identity</span>
              <span className={styles.agentFooterValue}>Agent wallet</span>
            </div>
            <div className={`${styles.agentFooterCol} ${styles.agentFooterEnd}`}>
              <span className={styles.agentFooterLabel}>One of One</span>
              <span className={styles.agentFooterValue}>{handle}</span>
            </div>
          </div>
        </article>
      </div>
    );
  }

  const { first, last } = splitName(owner);

  return (
    <div>
      <div className={styles.wrapper}>
        <article className={styles.card}>
          <div className={styles.cardBg} aria-hidden />
          <div className={styles.sheen} aria-hidden />
          <div className={styles.decoCloud} aria-hidden>
            <div className={styles.decoMain} />
            <div className={styles.decoBubble1} />
            <div className={styles.decoBubble2} />
            <div className={styles.decoBubble3} />
          </div>

          <div className={styles.topRow}>
            <div className={styles.brand}>
              <span className={styles.brandCloud} aria-hidden />
              <span className={styles.brandText}>AUTOWALLET</span>
            </div>
            <div className={styles.statusBadge}>
              <span
                className={`${styles.statusDot} ${live ? "" : styles.statusPaused}`}
              />
              <span className={styles.statusText}>
                {live ? "Active" : "Locked"}
              </span>
            </div>
          </div>

          <div className={styles.mid}>
            <div className={styles.midCopy}>
              <div className={styles.sectionLabel}>Personal wallet · Owner</div>
              <div className={styles.ownerName}>
                {first}
                {last ? (
                  <>
                    <br />
                    {last}
                  </>
                ) : null}
              </div>
              <div className={styles.handle}>{handle}</div>
            </div>
            <PayQr handle={handle} size={80} className={styles.qr} />
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Balance</span>
              <span className={styles.statValue}>{money(balanceUsd)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Spent Today</span>
              <span className={styles.statValue}>{money(spentTodayUsd)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Received</span>
              <span
                className={`${styles.statValue} ${receivedTodayUsd === 0 ? styles.statMuted : ""}`}
              >
                {money(receivedTodayUsd)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Available</span>
              <span className={styles.statValue}>{money(balanceUsd)}</span>
            </div>
          </div>
        </article>
      </div>
      {onManage ? (
        <button type="button" className={styles.manage} onClick={onManage}>
          Send money →
        </button>
      ) : null}
    </div>
  );
}

import type { Agent } from "@/data/wallets";
import { money, remaining, splitName, usedPct } from "@/lib/money";
import { CloudMark } from "@/components/CloudMark";
import styles from "./WalletTicket.module.css";

export function WalletTicket({
  agent,
  owner,
  onManage,
}: {
  agent: Agent;
  owner: string;
  onManage?: () => void;
}) {
  const { first, last } = splitName(owner);
  const used = usedPct(agent.spentTodayUsd, agent.dailyCapUsd);
  const left = remaining(agent.spentTodayUsd, agent.dailyCapUsd);
  const live = agent.status === "active";

  return (
    <div>
      <div className={styles.wrapper}>
        <article className={styles.card}>
          <div className={styles.lightBlob} aria-hidden />
          <div className={styles.warmGlow} aria-hidden />
          <div className={styles.vignette} aria-hidden />
          <div className={styles.grain} aria-hidden />
          <div className={styles.noise} aria-hidden />

          <div className={`${styles.notch} ${styles.notchTl}`} aria-hidden />
          <div className={`${styles.notch} ${styles.notchTr}`} aria-hidden />
          <div className={`${styles.notch} ${styles.notchBl}`} aria-hidden />
          <div className={`${styles.notch} ${styles.notchBr}`} aria-hidden />

          <div className={styles.perforation} aria-hidden />
          <div className={styles.watermark} aria-hidden>
            <div className={styles.watermarkFill}>WALLET</div>
          </div>
          <div className={styles.watermarkStroke} aria-hidden>
            WALLET
          </div>

          <div className={styles.content}>
            <div className={styles.topRow}>
              <div className={styles.brand}>
                <CloudMark className="opacity-[0.85]" />
                <span className={styles.brandText}>AutoWallet</span>
              </div>
              <div className={styles.statusBadge}>
                <span
                  className={`${styles.statusDot} ${live ? "" : styles.statusPaused}`}
                />
                <span className={styles.statusText}>
                  {live ? "Active" : "Paused"}
                </span>
              </div>
            </div>

            <div className={styles.nameSection}>
              <div className={styles.sectionLabel}>Agent Wallet · Owner</div>
              <div className={styles.ownerName}>
                {first}
                {last ? (
                  <>
                    <br />
                    {last}
                  </>
                ) : null}
              </div>
              <div className={styles.agentInfo}>
                <span className={styles.agentName}>{agent.name}</span>
                <span className={styles.dividerDot}>·</span>
                <span className={styles.agentDomain}>{agent.handle}</span>
              </div>
            </div>

            <div className={styles.statsRow}>
              <div>
                <div className={styles.statLabel}>Balance</div>
                <div className={styles.statValue}>
                  {money(agent.balanceUsd)}{" "}
                  <span className={styles.statMeta}>USD</span>
                </div>
              </div>
              <div>
                <div className={styles.statLabel}>Daily Limit</div>
                <div className={styles.statValue}>
                  {money(agent.dailyCapUsd)}
                </div>
              </div>
              <div>
                <div className={styles.statLabel}>Used Today</div>
                <div className={styles.statValue}>
                  {money(agent.spentTodayUsd)}{" "}
                  <span className={styles.statMeta}>{used}%</span>
                </div>
              </div>
              <div>
                <div className={styles.statLabel}>Remaining</div>
                <div className={styles.statValue}>{money(left)}</div>
              </div>
            </div>
          </div>
        </article>
      </div>
      {onManage ? (
        <button type="button" className={styles.manage} onClick={onManage}>
          Manage Wallet →
        </button>
      ) : null}
    </div>
  );
}

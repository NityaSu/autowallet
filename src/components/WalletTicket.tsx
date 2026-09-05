import { money, splitName } from "@/lib/money";
import { CloudMark } from "@/components/CloudMark";
import styles from "./WalletTicket.module.css";

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
  const { first, last } = splitName(owner);

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
              <div className={styles.sectionLabel}>
                {kind === "agent" ? "Agent wallet" : "Personal wallet · Owner"}
              </div>
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
                <span className={styles.agentDomain}>{handle}</span>
              </div>
            </div>

            <div className={styles.statsRow}>
              <div>
                <div className={styles.statLabel}>Balance</div>
                <div className={styles.statValue}>
                  {money(balanceUsd)}{" "}
                  <span className={styles.statMeta}>USD</span>
                </div>
              </div>
              <div>
                <div className={styles.statLabel}>Spent today</div>
                <div className={styles.statValue}>{money(spentTodayUsd)}</div>
              </div>
              <div>
                <div className={styles.statLabel}>Received today</div>
                <div className={styles.statValue}>{money(receivedTodayUsd)}</div>
              </div>
              <div>
                <div className={styles.statLabel}>Available</div>
                <div className={styles.statValue}>{money(balanceUsd)}</div>
              </div>
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

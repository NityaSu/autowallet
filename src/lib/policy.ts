export type AgentStatus = "active" | "paused";

export type PolicyCode =
  | "allow"
  | "wallet_paused"
  | "domain_blocked"
  | "over_per_request"
  | "over_daily_cap";

export type PolicyDecision =
  | { ok: true; code: "allow"; reason: string }
  | { ok: false; code: Exclude<PolicyCode, "allow">; reason: string };

export type PolicyWallet = {
  status: AgentStatus;
  allowlist: string[];
  perRequestMaxUsd: number;
  spentTodayUsd: number;
  dailyCapUsd: number;
};

function deny(
  code: Exclude<PolicyCode, "allow">,
  reason: string,
): PolicyDecision {
  return { ok: false, code, reason };
}

export function evaluatePolicy(
  wallet: PolicyWallet,
  req: { host: string; priceUsd: number },
): PolicyDecision {
  if (wallet.status === "paused") {
    return deny("wallet_paused", "virtual wallet is paused");
  }
  if (!wallet.allowlist.includes(req.host)) {
    return deny("domain_blocked", "domain not on allowlist");
  }
  if (req.priceUsd > wallet.perRequestMaxUsd) {
    return deny(
      "over_per_request",
      `$${req.priceUsd} > per-request max $${wallet.perRequestMaxUsd}`,
    );
  }
  if (wallet.spentTodayUsd + req.priceUsd > wallet.dailyCapUsd) {
    return deny("over_daily_cap", "over daily cap");
  }
  return { ok: true, code: "allow", reason: "within policy" };
}

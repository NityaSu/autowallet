"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  accountSeed,
  agentSeed,
  apiSeed,
  paymentSeed,
  peopleSeed,
  type Account,
  type Agent,
  type PaidApi,
  type Payment,
  type Person,
  type Transfer,
} from "@/data/wallets";
import { clockNow, round2 } from "@/lib/money";
import { evaluatePolicy } from "@/lib/policy";

function cloneAgents(): Agent[] {
  return agentSeed.map((a) => ({ ...a, allowlist: [...a.allowlist] }));
}

type PayResult = {
  ok: boolean;
  reason: string;
};

type SendResult = { ok: true } | { ok: false; reason: string };

type Store = {
  you: Person;
  people: Person[];
  transfers: Transfer[];
  ledgerReady: boolean;
  ledgerError: string;
  refreshLedger: () => Promise<void>;
  sendToPerson: (input: {
    toHandle: string;
    amount: number;
    memo: string;
    idempotencyKey: string;
  }) => Promise<SendResult>;
  account: Account;
  agents: Agent[];
  payments: Payment[];
  apis: PaidApi[];
  agentById: (id: string) => Agent | undefined;
  paymentsFor: (id: string) => Payment[];
  toggleAgent: (id: string) => void;
  fundAgent: (id: string, amount?: number) => void;
  addAllowHost: (id: string, host: string) => void;
  dropAllowHost: (id: string, host: string) => void;
  setCaps: (
    id: string,
    next: { dailyCapUsd?: number; perRequestMaxUsd?: number },
  ) => void;
  issueAgent: (input: {
    name: string;
    prefix: string;
    dailyCapUsd: number;
    perRequestMaxUsd: number;
  }) => Agent | null;
  attemptPay: (agentId: string, apiId: string) => PayResult;
};

const WalletContext = createContext<Store | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>(() =>
    peopleSeed.map((p) => ({ ...p })),
  );
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [ledgerReady, setLedgerReady] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [account, setAccount] = useState<Account>({ ...accountSeed });
  const [agents, setAgents] = useState<Agent[]>(cloneAgents);
  const [payments, setPayments] = useState<Payment[]>([...paymentSeed]);
  const apis = apiSeed;
  const you = people.find((p) => p.handle === account.handle) ?? people[0]!;

  const refreshLedger = useCallback(async () => {
    const res = await fetch("/api/me");
    const data = (await res.json()) as {
      ok: boolean;
      reason?: string;
      you?: Person;
      people?: Person[];
      transfers?: Transfer[];
    };
    if (!data.ok || !data.you || !data.people) {
      setLedgerError(data.reason ?? "Ledger unavailable.");
      setLedgerReady(false);
      return;
    }
    setLedgerError("");
    setPeople(data.people);
    setTransfers(data.transfers ?? []);
    setAccount((acc) => ({
      ...acc,
      owner: data.you!.name,
      firstName: data.you!.name.split(" ")[0] ?? data.you!.name,
      handle: data.you!.handle,
      balanceUsd: data.you!.balanceUsd,
    }));
    setLedgerReady(true);
  }, []);

  useEffect(() => {
    void refreshLedger();
  }, [refreshLedger]);

  const sendToPerson = useCallback(
    async (input: {
      toHandle: string;
      amount: number;
      memo: string;
      idempotencyKey: string;
    }): Promise<SendResult> => {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toHandle: input.toHandle,
          amount: input.amount,
          memo: input.memo,
          idempotencyKey: input.idempotencyKey,
        }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) return { ok: false, reason: data.reason ?? "Send failed." };
      await refreshLedger();
      return { ok: true };
    },
    [refreshLedger],
  );

  const agentById = useCallback(
    (id: string) => agents.find((a) => a.id === id),
    [agents],
  );

  const paymentsFor = useCallback(
    (id: string) => payments.filter((p) => p.agentId === id),
    [payments],
  );

  const toggleAgent = useCallback((id: string) => {
    setAgents((list) =>
      list.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "active" ? "paused" : "active" }
          : a,
      ),
    );
  }, []);

  const fundAgent = useCallback((id: string, amount = 10) => {
    setAccount((acc) => {
      if (acc.balanceUsd < amount) return acc;
      setAgents((list) =>
        list.map((a) =>
          a.id === id
            ? {
                ...a,
                balanceUsd: round2(a.balanceUsd + amount),
                fundedUsd: round2(a.fundedUsd + amount),
              }
            : a,
        ),
      );
      return { ...acc, balanceUsd: round2(acc.balanceUsd - amount) };
    });
  }, []);

  const addAllowHost = useCallback((id: string, host: string) => {
    const clean = host.trim().toLowerCase();
    if (!clean) return;
    setAgents((list) =>
      list.map((a) =>
        a.id === id && !a.allowlist.includes(clean)
          ? { ...a, allowlist: [...a.allowlist, clean] }
          : a,
      ),
    );
  }, []);

  const dropAllowHost = useCallback((id: string, host: string) => {
    setAgents((list) =>
      list.map((a) =>
        a.id === id
          ? { ...a, allowlist: a.allowlist.filter((h) => h !== host) }
          : a,
      ),
    );
  }, []);

  const setCaps = useCallback(
    (id: string, next: { dailyCapUsd?: number; perRequestMaxUsd?: number }) => {
      setAgents((list) =>
        list.map((a) => (a.id === id ? { ...a, ...next } : a)),
      );
    },
    [],
  );

  const issueAgent = useCallback(
    (input: {
      name: string;
      prefix: string;
      dailyCapUsd: number;
      perRequestMaxUsd: number;
    }) => {
      const prefix =
        input.prefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") ||
        "agent";
      const handle = `${prefix}.pay`;
      if (agents.some((a) => a.handle === handle)) return null;
      const next: Agent = {
        id: `ag-${Date.now()}`,
        name: input.name.trim() || "New Agent",
        handle,
        status: "active",
        balanceUsd: 0,
        fundedUsd: 0,
        spentTodayUsd: 0,
        dailyCapUsd: input.dailyCapUsd,
        perRequestMaxUsd: input.perRequestMaxUsd,
        allowlist: ["api.search.com"],
        publicKey: `0x${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`,
      };
      setAgents((list) => [next, ...list]);
      return next;
    },
    [agents],
  );

  const attemptPay = useCallback(
    (agentId: string, apiId: string): PayResult => {
      const agent = agents.find((a) => a.id === agentId);
      const api = apis.find((item) => item.id === apiId);
      if (!agent || !api) {
        return { ok: false, reason: "missing agent or API" };
      }

      setAccount((acc) => ({ ...acc, requests: acc.requests + 1 }));

      const decision = evaluatePolicy(agent, {
        host: api.host,
        priceUsd: api.priceUsd,
      });

      const record = (status: Payment["status"], reason: string) => {
        const entry: Payment = {
          id: `pay-${Date.now()}`,
          at: clockNow(),
          agentId: agent.id,
          apiName: api.name,
          host: api.host,
          amountUsd: api.priceUsd,
          status,
          reason,
        };
        setPayments((list) => [entry, ...list]);
      };

      if (!decision.ok) {
        record("blocked", decision.reason);
        return { ok: false, reason: decision.reason };
      }

      if (agent.balanceUsd < api.priceUsd) {
        const reason = "insufficient virtual wallet balance";
        record("blocked", reason);
        return { ok: false, reason };
      }

      setAgents((list) =>
        list.map((a) =>
          a.id === agent.id
            ? {
                ...a,
                spentTodayUsd: round2(a.spentTodayUsd + api.priceUsd),
                balanceUsd: round2(a.balanceUsd - api.priceUsd),
              }
            : a,
        ),
      );
      setAccount((acc) => ({
        ...acc,
        spentUsd: round2(acc.spentUsd + api.priceUsd),
      }));
      record("settled", decision.reason);
      return { ok: true, reason: decision.reason };
    },
    [agents, apis],
  );

  const value = useMemo<Store>(
    () => ({
      you,
      people,
      transfers,
      ledgerReady,
      ledgerError,
      refreshLedger,
      sendToPerson,
      account: { ...account, balanceUsd: you.balanceUsd },
      agents,
      payments,
      apis,
      agentById,
      paymentsFor,
      toggleAgent,
      fundAgent,
      addAllowHost,
      dropAllowHost,
      setCaps,
      issueAgent,
      attemptPay,
    }),
    [
      you,
      people,
      transfers,
      ledgerReady,
      ledgerError,
      refreshLedger,
      sendToPerson,
      account,
      agents,
      payments,
      apis,
      agentById,
      paymentsFor,
      toggleAgent,
      fundAgent,
      addAllowHost,
      dropAllowHost,
      setCaps,
      issueAgent,
      attemptPay,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

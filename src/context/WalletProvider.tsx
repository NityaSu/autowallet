"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  YOU_HANDLE,
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
import { applySend } from "@/lib/send";

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
  sendToPerson: (input: {
    toHandle: string;
    amount: number;
    memo: string;
  }) => SendResult;
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
  const [account, setAccount] = useState<Account>({ ...accountSeed });
  const [agents, setAgents] = useState<Agent[]>(cloneAgents);
  const [payments, setPayments] = useState<Payment[]>([...paymentSeed]);
  const apis = apiSeed;
  const you = people.find((p) => p.handle === YOU_HANDLE) ?? people[0]!;

  const sendToPerson = useCallback(
    (input: { toHandle: string; amount: number; memo: string }): SendResult => {
      const result = applySend(people, YOU_HANDLE, input.toHandle, input.amount);
      if (!result.ok) return result;
      const entry: Transfer = {
        id: `tx-${Date.now()}`,
        at: clockNow(),
        fromHandle: YOU_HANDLE,
        toHandle: input.toHandle.trim().toLowerCase(),
        amountUsd: result.amount,
        memo: input.memo.trim() || "—",
      };
      setPeople(result.people);
      setTransfers((list) => [entry, ...list]);
      return { ok: true };
    },
    [people],
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
    }),
    [
      you,
      people,
      transfers,
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

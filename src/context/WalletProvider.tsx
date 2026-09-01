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
  type Account,
  type Agent,
  type PaidApi,
  type Payment,
  type Person,
  type Transfer,
} from "@/data/wallets";

type Recipient = {
  id: string;
  name: string;
  handle: string;
};

type PayResult = {
  ok: boolean;
  reason: string;
  paymentId?: string;
};

type SendResult = { ok: true } | { ok: false; reason: string };

type Store = {
  you: Person;
  people: Recipient[];
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
  toggleAgent: (id: string) => Promise<void>;
  fundAgent: (id: string, amount?: number) => Promise<boolean>;
  addAllowHost: (id: string, host: string) => Promise<void>;
  dropAllowHost: (id: string, host: string) => Promise<void>;
  setCaps: (
    id: string,
    next: { dailyCapUsd?: number; perRequestMaxUsd?: number },
  ) => Promise<void>;
  issueAgent: (input: {
    name: string;
    prefix: string;
    dailyCapUsd: number;
    perRequestMaxUsd: number;
  }) => Promise<Agent | null>;
  attemptPay: (
    agentId: string,
    apiId: string,
    idempotencyKey?: string,
  ) => Promise<PayResult>;
};

const WalletContext = createContext<Store | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Recipient[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [ledgerReady, setLedgerReady] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [account, setAccount] = useState<Account>({ ...accountSeed });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apis, setApis] = useState<PaidApi[]>([]);
  const [you, setYou] = useState<Person>({
    id: "",
    name: "",
    handle: "",
    balanceUsd: 0,
  });

  const refreshLedger = useCallback(async () => {
    const res = await fetch("/api/me");
    const data = (await res.json()) as {
      ok: boolean;
      reason?: string;
      you?: Person;
      recipients?: Recipient[];
      people?: Recipient[];
      transfers?: Transfer[];
      agents?: Agent[];
      payments?: Payment[];
      apis?: PaidApi[];
    };
    if (!data.ok || !data.you) {
      setLedgerError(data.reason ?? "Ledger unavailable.");
      setLedgerReady(false);
      return;
    }
    setLedgerError("");
    setYou(data.you);
    setPeople(data.recipients ?? data.people ?? []);
    setTransfers(data.transfers ?? []);
    setAgents(data.agents ?? []);
    setPayments(
      (data.payments ?? []).map((p) => ({
        ...p,
        at: p.at.includes("T")
          ? new Date(p.at).toLocaleTimeString("en-US", { hour12: false })
          : p.at,
      })),
    );
    setApis(data.apis ?? []);
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

  const toggleAgent = useCallback(
    async (id: string) => {
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, action: "toggle" }),
      });
      await refreshLedger();
    },
    [refreshLedger],
  );

  const fundAgent = useCallback(
    async (id: string, amount = 10) => {
      const res = await fetch(`/api/agents/${id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: amount,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!data.ok) return false;
      await refreshLedger();
      return true;
    },
    [refreshLedger],
  );

  const addAllowHost = useCallback(
    async (id: string, host: string) => {
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, addHost: host }),
      });
      await refreshLedger();
    },
    [refreshLedger],
  );

  const dropAllowHost = useCallback(
    async (id: string, host: string) => {
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, dropHost: host }),
      });
      await refreshLedger();
    },
    [refreshLedger],
  );

  const setCaps = useCallback(
    async (
      id: string,
      next: { dailyCapUsd?: number; perRequestMaxUsd?: number },
    ) => {
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, ...next }),
      });
      await refreshLedger();
    },
    [refreshLedger],
  );

  const issueAgent = useCallback(
    async (input: {
      name: string;
      prefix: string;
      dailyCapUsd: number;
      perRequestMaxUsd: number;
    }) => {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as {
        ok: boolean;
        agent?: Agent;
      };
      if (!data.ok || !data.agent) return null;
      await refreshLedger();
      return data.agent;
    },
    [refreshLedger],
  );

  const attemptPay = useCallback(
    async (
      agentId: string,
      apiId: string,
      idempotencyKey = crypto.randomUUID(),
    ): Promise<PayResult> => {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, apiId, idempotencyKey }),
      });
      const data = (await res.json()) as PayResult;
      await refreshLedger();
      return data;
    },
    [refreshLedger],
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

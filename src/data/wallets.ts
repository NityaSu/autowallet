import type { AgentStatus } from "@/lib/policy";

export type PayStatus = "settled" | "blocked";

export type Person = {
  id: string;
  name: string;
  handle: string;
  balanceUsd: number;
};

export type Transfer = {
  id: string;
  at: string;
  fromHandle: string;
  toHandle: string;
  amountUsd: number;
  memo: string;
  status?: string;
};

export type Account = {
  owner: string;
  firstName: string;
  handle: string;
  balanceUsd: number;
  spentUsd: number;
  requests: number;
};

export type Agent = {
  id: string;
  name: string;
  handle: string;
  status: AgentStatus;
  balanceUsd: number;
  fundedUsd: number;
  spentTodayUsd: number;
  dailyCapUsd: number;
  perRequestMaxUsd: number;
  allowlist: string[];
  publicKey: string;
};

export type PaidApi = {
  id: string;
  name: string;
  host: string;
  path: string;
  priceUsd: number;
  description: string;
  payload: string;
};

export type Payment = {
  id: string;
  at: string;
  agentId: string;
  apiName: string;
  host: string;
  amountUsd: number;
  status: PayStatus;
  reason: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  agentId: string;
  agentHandle: string;
  agentName: string;
  apiId: string;
  apiName: string;
  host: string;
  amountUsd: number;
  status: PayStatus;
  reason: string;
  transferId: string | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuditPage = {
  payments: AuditEntry[];
  pagination: Pagination;
};

export type LabStep = {
  id: number;
  label: string;
  detail: string;
};

export const YOU_HANDLE = "sunik.pay";

export const peopleSeed: Person[] = [
  {
    id: "sunik",
    name: "Sunik Codes",
    handle: YOU_HANDLE,
    balanceUsd: 82.4,
  },
  {
    id: "midas",
    name: "Midas Wang",
    handle: "midas.pay",
    balanceUsd: 24,
  },
];

export const accountSeed: Account = {
  owner: "Sunik Codes",
  firstName: "Sunik",
  handle: YOU_HANDLE,
  balanceUsd: 248.2,
  spentUsd: 31.82,
  requests: 12481,
};

export const agentSeed: Agent[] = [
  {
    id: "research",
    name: "Research Agent",
    handle: "research-agent.pay",
    status: "active",
    balanceUsd: 82.4,
    fundedUsd: 100,
    spentTodayUsd: 3.42,
    dailyCapUsd: 10,
    perRequestMaxUsd: 1,
    allowlist: ["api.search.com", "api.openai.com", "data.example.com"],
    publicKey: "0x8f2a…c91e",
  },
  {
    id: "coding",
    name: "Coding Agent",
    handle: "coding-agent.pay",
    status: "active",
    balanceUsd: 54.1,
    fundedUsd: 80,
    spentTodayUsd: 4.18,
    dailyCapUsd: 20,
    perRequestMaxUsd: 2,
    allowlist: ["api.openai.com", "data.example.com"],
    publicKey: "0x3c11…aa04",
  },
  {
    id: "writer",
    name: "Data Agent",
    handle: "data-agent.pay",
    status: "active",
    balanceUsd: 36.5,
    fundedUsd: 20,
    spentTodayUsd: 0.18,
    dailyCapUsd: 5,
    perRequestMaxUsd: 0.25,
    allowlist: ["data.example.com"],
    publicKey: "0xb77d…12f0",
  },
];

export const apiSeed: PaidApi[] = [
  {
    id: "search",
    name: "Search API",
    host: "api.search.com",
    path: "/v1/query",
    priceUsd: 0.02,
    description: "Cheap lookup. Research Agent should settle this.",
    payload: '{ "hits": 12, "top": "x402 wallets" }',
  },
  {
    id: "llm",
    name: "LLM API",
    host: "api.openai.com",
    path: "/v1/chat",
    priceUsd: 0.14,
    description: "Inference call. On Research and Coding allowlists.",
    payload: '{ "text": "payment settled" }',
  },
  {
    id: "data",
    name: "Data API",
    host: "data.example.com",
    path: "/v1/rows",
    priceUsd: 0.08,
    description: "Structured rows. Allowed for every seeded agent.",
    payload: '{ "rows": 40 }',
  },
  {
    id: "unknown",
    name: "Unknown API",
    host: "unknown.api",
    path: "/v1",
    priceUsd: 2,
    description: "Not on any allowlist — policy should block.",
    payload: '{ "blocked": true }',
  },
];

export const paymentSeed: Payment[] = [
  {
    id: "pay-1",
    at: "13:42:11",
    agentId: "research",
    apiName: "Search API",
    host: "api.search.com",
    amountUsd: 0.02,
    status: "settled",
    reason: "within policy",
  },
  {
    id: "pay-2",
    at: "13:38:04",
    agentId: "coding",
    apiName: "LLM API",
    host: "api.openai.com",
    amountUsd: 0.14,
    status: "settled",
    reason: "within policy",
  },
  {
    id: "pay-3",
    at: "13:21:55",
    agentId: "research",
    apiName: "Data API",
    host: "data.example.com",
    amountUsd: 0.08,
    status: "settled",
    reason: "within policy",
  },
  {
    id: "pay-4",
    at: "12:58:02",
    agentId: "research",
    apiName: "Unknown API",
    host: "unknown.api",
    amountUsd: 2,
    status: "blocked",
    reason: "domain not on allowlist",
  },
];

export const labSteps: LabStep[] = [
  {
    id: 1,
    label: "Request",
    detail: "Agent SDK hits the paid route with a normal GET.",
  },
  {
    id: 2,
    label: "HTTP 402",
    detail: "Origin returns Payment Required plus machine-readable terms.",
  },
  {
    id: 3,
    label: "Intercept",
    detail: "wrapFetchWithPayment (or your proxy) catches the challenge.",
  },
  {
    id: 4,
    label: "Policy",
    detail: "Virtual wallet checks pause, allowlist, per-request, daily cap.",
  },
  {
    id: 5,
    label: "Sign",
    detail: "Agent key signs PAYMENT-SIGNATURE. Handle is attached as identity.",
  },
  {
    id: 6,
    label: "Settle",
    detail: "Facilitator verifies + broadcasts. This PoC mocks that rail.",
  },
  {
    id: 7,
    label: "200 OK",
    detail: "Retry succeeds. Resource body returns. Ledger records spend.",
  },
];

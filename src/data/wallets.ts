import type { AgentStatus } from "@/lib/policy";

export type PayStatus = "settled" | "blocked";

export type Person = {
  id: string;
  name: string;
  handle: string;
  balanceUsd: number;
  locked?: boolean;
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
  category: "hotel" | "flight" | "bus" | "tools" | "blocked";
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
  {
    id: "travel",
    name: "Travel Agent",
    handle: "travel-agent.pay",
    status: "active",
    balanceUsd: 400,
    fundedUsd: 400,
    spentTodayUsd: 0,
    dailyCapUsd: 500,
    perRequestMaxUsd: 200,
    allowlist: ["api.hotels.example", "api.flights.example"],
    publicKey: "0xa41e…7c08",
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
    category: "tools",
  },
  {
    id: "llm",
    name: "LLM API",
    host: "api.openai.com",
    path: "/v1/chat",
    priceUsd: 0.14,
    description: "Inference call. On Research and Coding allowlists.",
    payload: '{ "text": "payment settled" }',
    category: "tools",
  },
  {
    id: "data",
    name: "Data API",
    host: "data.example.com",
    path: "/v1/rows",
    priceUsd: 0.08,
    description: "Structured rows. Allowed for every seeded agent.",
    payload: '{ "rows": 40 }',
    category: "tools",
  },
  {
    id: "unknown",
    name: "Unknown API",
    host: "unknown.api",
    path: "/v1",
    priceUsd: 2,
    description: "Not on any allowlist — policy should block.",
    payload: '{ "blocked": true }',
    category: "blocked",
  },
  {
    id: "hotel",
    name: "Hotel hold",
    host: "api.hotels.example",
    path: "/v1/book",
    priceUsd: 89,
    description: "Two-night hold. Travel Agent should settle this.",
    payload: '{ "city": "Bangkok", "nights": 2 }',
    category: "hotel",
  },
  {
    id: "flight",
    name: "Flight hold",
    host: "api.flights.example",
    path: "/v1/book",
    priceUsd: 149,
    description: "One-way hold. On Travel Agent’s allowlist.",
    payload: '{ "from": "BKK", "to": "NRT" }',
    category: "flight",
  },
  {
    id: "bus",
    name: "Bus ticket",
    host: "api.buses.example",
    path: "/v1/book",
    priceUsd: 45,
    description: "Not on Travel Agent — policy should 402.",
    payload: '{ "route": "Bangkok–Chiang Mai" }',
    category: "bus",
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
    label: "POST /api/pay",
    detail: "Browser session or Bearer ak_… — same endpoint.",
  },
  {
    id: 2,
    label: "Policy",
    detail: "Pause, allowlist, per-request max, daily cap, then balance.",
  },
  {
    id: 3,
    label: "Settle or 402",
    detail: "Allow writes a transfer to the vendor. Deny writes a blocked receipt.",
  },
  {
    id: 4,
    label: "Receipt",
    detail: "Ledger row stays after refresh. Nothing hits a live OpenAI rail.",
  },
];

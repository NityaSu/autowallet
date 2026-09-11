import { apiSeed, type PaidApi } from "@/data/wallets";

export const VENDOR_HANDLES: Record<string, string> = {
  search: "search-api.pay",
  llm: "llm-api.pay",
  data: "data-api.pay",
  unknown: "unknown-api.pay",
  hotel: "hotel-api.pay",
  flight: "flight-api.pay",
  bus: "bus-api.pay",
};

const VENDOR_INDEX: Record<string, number> = {
  search: 1,
  llm: 2,
  data: 3,
  unknown: 4,
  hotel: 5,
  flight: 6,
  bus: 7,
};

const CATEGORY_LABEL: Record<PaidApi["category"], string> = {
  hotel: "Hotel",
  flight: "Flight",
  bus: "Bus",
  tools: "Tools",
  blocked: "Blocked",
};

const CATEGORY_ORDER: PaidApi["category"][] = [
  "hotel",
  "flight",
  "bus",
  "tools",
  "blocked",
];

export function vendorHandleForApi(apiId: string) {
  return VENDOR_HANDLES[apiId] ?? null;
}

export function getApiCatalog() {
  return apiSeed;
}

export function getApiById(apiId: string) {
  return apiSeed.find((a) => a.id === apiId) ?? null;
}

export function categoryLabel(category: PaidApi["category"]) {
  return CATEGORY_LABEL[category];
}

export function categoryForHost(host: string) {
  return apiSeed.find((api) => api.host === host)?.category ?? null;
}

export function catalogByCategory() {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    items: apiSeed.filter((api) => api.category === category),
  })).filter((group) => group.items.length > 0);
}

export const VENDOR_SEED = apiSeed.map((api) => ({
  id: `33333333-3333-3333-3333-${String(VENDOR_INDEX[api.id] ?? 99).padStart(12, "0")}`,
  handle: VENDOR_HANDLES[api.id]!,
  name: `${api.name} Vendor`,
}));

import { apiSeed } from "@/data/wallets";

export const VENDOR_HANDLES: Record<string, string> = {
  search: "search-api.pay",
  llm: "llm-api.pay",
  data: "data-api.pay",
  unknown: "unknown-api.pay",
};

export function vendorHandleForApi(apiId: string) {
  return VENDOR_HANDLES[apiId] ?? null;
}

export function getApiCatalog() {
  return apiSeed;
}

export function getApiById(apiId: string) {
  return apiSeed.find((a) => a.id === apiId) ?? null;
}

export const VENDOR_SEED = apiSeed.map((api) => ({
  handle: VENDOR_HANDLES[api.id]!,
  name: `${api.name} Vendor`,
}));

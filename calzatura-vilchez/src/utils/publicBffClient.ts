import { getBackendApiBaseUrl } from "@/config/apiBackend";
import type { Product } from "@/types";

export type PublicCatalogPage = {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicCatalogBrowseMeta = {
  marcas: Array<{ label: string; value: string }>;
  availableSizes: string[];
  priceBounds: { min: number; max: number; low: number; high: number };
};

export type PublicCatalogBrowseResult = PublicCatalogPage & {
  familyGroupCounts: Record<string, number>;
  meta: PublicCatalogBrowseMeta;
};

export function hasPublicBff(): boolean {
  return Boolean(getBackendApiBaseUrl());
}

export async function publicBffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("BFF no configurado");
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${base}${normalized}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return payload;
}

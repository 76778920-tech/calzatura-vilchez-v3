import { getBackendApiBaseUrl } from "@/config/apiBackend";
import { auth } from "@/firebase/config";
import { bffFetch } from "@/utils/bffClient";
import type { PanelFetchScope } from "@/security/panelScope";
import type { DailySale, ProductFinancial, ProductPriceRange } from "@/types";

/** Admin: datos completos. Staff: solo ventas propias y rangos sin costo. */
export type FinanceFetchScope = PanelFetchScope;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculatePriceRange(
  costoCompra: number,
  margenMinimo = 25,
  margenObjetivo = 45,
  margenMaximo = 75
) {
  const cost = Math.max(0, Number(costoCompra) || 0);
  const min = Math.max(0, Number(margenMinimo) || 0);
  const target = Math.max(min, Number(margenObjetivo) || min);
  const max = Math.max(target, Number(margenMaximo) || target);

  return {
    margenMinimo: min,
    margenObjetivo: target,
    margenMaximo: max,
    precioMinimo: roundMoney(cost * (1 + min / 100)),
    precioSugerido: roundMoney(cost * (1 + target / 100)),
    precioMaximo: roundMoney(cost * (1 + max / 100)),
  };
}

export async function fetchProductFinancials(scope: "admin"): Promise<Record<string, ProductFinancial>>;
export async function fetchProductFinancials(scope: "staff"): Promise<Record<string, ProductPriceRange>>;
export async function fetchProductFinancials(
  scope: FinanceFetchScope = "admin",
): Promise<Record<string, ProductFinancial | ProductPriceRange>> {
  const path = scope === "staff" ? "/staff/productPriceRanges" : "/admin/productFinanzas";
  const { rows } = await bffFetch<{ rows: (ProductFinancial | ProductPriceRange)[] }>(path);
  return (rows ?? []).reduce<Record<string, ProductFinancial | ProductPriceRange>>((acc, item) => {
    acc[item.productId] = item;
    return acc;
  }, {});
}

export async function upsertProductFinancial(
  productId: string,
  data: Omit<ProductFinancial, "productId" | "actualizadoEn">
): Promise<void> {
  await bffFetch(`/admin/productFinanzas/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProductFinancial(productId: string): Promise<void> {
  await bffFetch(`/admin/productFinanzas/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

function sortDailySales(rows: DailySale[]) {
  return [...rows].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

async function fetchDailySalesViaBff(
  params: { fecha?: string; sinceDays?: number; scope: FinanceFetchScope },
): Promise<DailySale[] | null> {
  const base = getBackendApiBaseUrl();
  const user = auth.currentUser;
  if (!base || !user) return null;

  const qs = new URLSearchParams();
  if (params.fecha) qs.set("fecha", params.fecha);
  else qs.set("sinceDays", String(params.sinceDays ?? 90));

  const path = params.scope === "staff" ? "/staff/dailySales" : "/admin/dailySales";

  try {
    const response = await fetch(`${base}${path}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { sales?: DailySale[] };
    return Array.isArray(payload.sales) ? sortDailySales(payload.sales) : null;
  } catch {
    return null;
  }
}

/** Ventas en tienda física: solo vía BFF (service role). */
export async function fetchDailySales(
  date?: string,
  scope: FinanceFetchScope = "admin",
): Promise<DailySale[]> {
  const fromBff = await fetchDailySalesViaBff(
    date ? { fecha: date, scope } : { sinceDays: 90, scope },
  );
  if (fromBff) return fromBff;

  if (scope === "staff") {
    throw new Error("No se pudieron cargar tus ventas diarias");
  }

  throw new Error(
    "No se pudieron cargar las ventas diarias. Verifica que el servidor BFF esté disponible y que hayas iniciado sesión.",
  );
}

export async function addDailySale(data: Omit<DailySale, "id" | "creadoEn">): Promise<string> {
  const ids = await registerDailySalesAtomic([{ ...data }], "admin");
  return ids[0] ?? "";
}

export type DailySaleAtomicInput = Omit<DailySale, "id" | "creadoEn" | "devuelto" | "motivoDevolucion" | "devueltoEn" | "canal">;

/** Payload de registro sin costos (el BFF los calcula en servidor para trabajador). */
export type StaffDailySaleAtomicInput = Omit<DailySaleAtomicInput, "costoUnitario" | "costoTotal" | "ganancia">;

function stripClientFinancialFieldsFromSale(sale: DailySaleAtomicInput): StaffDailySaleAtomicInput {
  const staffSale = { ...sale };
  delete staffSale.costoUnitario;
  delete staffSale.costoTotal;
  delete staffSale.ganancia;
  return staffSale;
}

async function registerDailySalesViaBff(
  path: "/staff/dailySales/register" | "/admin/dailySales/register",
  sales: StaffDailySaleAtomicInput[] | DailySaleAtomicInput[],
): Promise<string[]> {
  const { ids } = await bffFetch<{ ids: string[] }>(path, {
    method: "POST",
    body: JSON.stringify({ sales }),
  });
  return ids ?? [];
}

export async function registerDailySalesAtomic(
  sales: DailySaleAtomicInput[],
  scope: FinanceFetchScope = "admin",
): Promise<string[]> {
  const path = scope === "staff" ? "/staff/dailySales/register" : "/admin/dailySales/register";
  const payload = sales.map(stripClientFinancialFieldsFromSale);
  return registerDailySalesViaBff(path, payload);
}

export async function markSaleReturned(saleId: string, motivo: string): Promise<void> {
  await returnDailySaleAtomic(saleId, motivo, "admin");
}

export async function returnDailySaleAtomic(
  saleId: string,
  motivo: string,
  scope: FinanceFetchScope = "admin",
): Promise<Pick<DailySale, "id" | "productId" | "devuelto" | "motivoDevolucion" | "devueltoEn">> {
  const path = scope === "staff" ? "/staff/dailySales/return" : "/admin/dailySales/return";
  const { sale } = await bffFetch<{
    sale: Pick<DailySale, "id" | "productId" | "devuelto" | "motivoDevolucion" | "devueltoEn">;
  }>(path, {
    method: "POST",
    body: JSON.stringify({ saleId, motivo }),
  });
  return sale;
}

export async function decrementProductStock(
  productId: string,
  lines: { talla: string | null; cantidad: number }[]
): Promise<void> {
  await bffFetch("/admin/products/decrementStock", {
    method: "POST",
    body: JSON.stringify({ productId, lines }),
  });
}

export async function restoreProductStock(
  productId: string,
  talla: string | null,
  cantidad: number
): Promise<void> {
  await bffFetch("/admin/products/restoreStock", {
    method: "POST",
    body: JSON.stringify({ productId, talla: talla ?? null, cantidad }),
  });
}

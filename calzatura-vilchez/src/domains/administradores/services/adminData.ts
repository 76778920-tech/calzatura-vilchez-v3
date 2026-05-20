import { bffFetch } from "@/utils/bffClient";

export type AdminDataCollection =
  | "productos"
  | "productoFinanzas"
  | "fabricantes"
  | "ventasDiarias"
  | "pedidos"
  | "usuarios";

export async function adminDataProductIds(): Promise<Set<string>> {
  const { ids } = await bffFetch<{ ids: string[] }>("/admin/data/product-ids");
  return new Set((ids ?? []).map((id) => String(id).trim()).filter(Boolean));
}

export async function adminDataExport(collection: AdminDataCollection): Promise<{
  rows: Record<string, unknown>[];
  extra?: Record<string, string>;
}> {
  const qs = new URLSearchParams({ collection });
  return bffFetch<{ rows: Record<string, unknown>[]; extra?: Record<string, string> }>(
    `/admin/data/export?${qs.toString()}`,
  );
}

export async function adminDataImport(payload: {
  collection: AdminDataCollection;
  rows: Record<string, unknown>[];
  onConflict?: string;
  productCodes?: { productoId: string; codigo: string }[];
}): Promise<{ imported: number }> {
  const result = await bffFetch<{ ok: boolean; imported: number }>("/admin/data/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { imported: result.imported ?? 0 };
}

export async function adminDataListTestDocs(): Promise<{ colId: string; data: Record<string, unknown> }[]> {
  const { docs } = await bffFetch<{ docs: { colId: string; data: Record<string, unknown> }[] }>(
    "/admin/data/test-batches",
  );
  return docs ?? [];
}

export async function adminDataDeleteScenarioTestData(escenario: string): Promise<void> {
  const qs = new URLSearchParams({ mode: "scenario", escenario });
  await bffFetch(`/admin/data/test-data?${qs.toString()}`, { method: "DELETE" });
}

export async function adminDataDeleteTestBatch(loteImportacion: string): Promise<void> {
  const qs = new URLSearchParams({ mode: "batch", loteImportacion });
  await bffFetch(`/admin/data/test-data?${qs.toString()}`, { method: "DELETE" });
}

export async function adminDataCountSalesUntil(until: string): Promise<number> {
  const qs = new URLSearchParams({ until });
  const { count } = await bffFetch<{ count: number }>(`/admin/data/sales/count?${qs.toString()}`);
  return count ?? 0;
}

export async function adminDataDeleteSalesUntil(until: string): Promise<number> {
  const qs = new URLSearchParams({ until });
  const { deleted } = await bffFetch<{ deleted: number }>(`/admin/data/sales?${qs.toString()}`, {
    method: "DELETE",
  });
  return deleted ?? 0;
}

export async function fetchCloudinaryUploadSignature(): Promise<{
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}> {
  return bffFetch("/admin/media/cloudinary-signature", { method: "POST", body: "{}" });
}

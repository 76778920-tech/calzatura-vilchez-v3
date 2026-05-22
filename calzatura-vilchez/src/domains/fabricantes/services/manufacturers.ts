import { bffFetch } from "@/utils/bffClient";
import type { Manufacturer } from "@/types";

export async function fetchManufacturers(): Promise<Manufacturer[]> {
  const { manufacturers } = await bffFetch<{ manufacturers: Manufacturer[] }>("/admin/manufacturers");
  return manufacturers ?? [];
}

export async function addManufacturer(data: Omit<Manufacturer, "id">): Promise<string> {
  const { id } = await bffFetch<{ id: string }>("/admin/manufacturers", {
    method: "POST",
    body: JSON.stringify({ manufacturer: data }),
  });
  return id;
}

export async function updateManufacturer(
  id: string,
  data: Partial<Omit<Manufacturer, "id" | "creadoEn">>,
): Promise<void> {
  await bffFetch(`/admin/manufacturers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ manufacturer: data }),
  });
}

export async function deleteManufacturer(id: string): Promise<void> {
  await bffFetch(`/admin/manufacturers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

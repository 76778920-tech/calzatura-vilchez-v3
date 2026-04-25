import { supabase } from "@/supabase/client";
import { logAudit } from "@/services/audit";
import type { Manufacturer } from "@/types";

const COL = "fabricantes";

export async function fetchManufacturers(): Promise<Manufacturer[]> {
  const { data, error } = await supabase.from(COL).select("*").order("marca");
  if (error) throw error;
  return data as Manufacturer[];
}

export async function addManufacturer(data: Omit<Manufacturer, "id">): Promise<string> {
  const { data: row, error } = await supabase.from(COL).insert(data).select("id").single();
  if (error) throw error;
  void logAudit("crear", "fabricante", row.id, `${data.nombres} ${data.apellidos} — ${data.marca}`);
  return row.id;
}

export async function updateManufacturer(
  id: string,
  data: Partial<Omit<Manufacturer, "id" | "creadoEn">>
): Promise<void> {
  const { error } = await supabase.from(COL).update(data).eq("id", id);
  if (error) throw error;
  void logAudit("editar", "fabricante", id, data.marca ?? id, { campos: Object.keys(data) });
}

export async function deleteManufacturer(id: string): Promise<void> {
  const { error } = await supabase.from(COL).delete().eq("id", id);
  if (error) throw error;
  void logAudit("eliminar", "fabricante", id, id);
}

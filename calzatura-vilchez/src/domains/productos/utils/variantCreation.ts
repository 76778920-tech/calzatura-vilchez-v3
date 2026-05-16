import type { Product } from "@/types";
import { buildColorStockForVariant } from "@/utils/colorStockPayload";

export function normalizeVariantCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

export function isValidVariantCode(value: string): boolean {
  return /^[A-Z0-9-]{3,40}$/.test(value);
}

type CreationBase = {
  codigoBase: string;
  familiaId: string;
  nombre: string;
  precio: number;
  descripcion: string;
  categoria: string;
  tipoCalzado?: string;
  marca: string;
  material?: string;
  estilo?: string;
  destacado?: boolean;
  activo?: boolean;
  descuento?: 10 | 20 | 30;
  campana?: string;
};

export type VariantDraft = {
  index: number;
  color: string;
  imagenes: string[];
  tallaStock: Record<string, number>;
  totalStock: number;
  /** Texto solo para esta variante; si viene vacío se usa `base.descripcion`. */
  descripcion?: string;
  /** Visibilidad en tienda por color; si falta se usa `base.activo`. */
  activo?: boolean;
};

type CreationPlanItem = {
  generatedCode: string;
  product: Omit<Product, "id">;
};

function sizesFromTallaStock(tallaStock: Record<string, number>): string[] {
  return Object.entries(tallaStock)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size)
    .sort((a, b) => Number(a) - Number(b));
}

export function buildVariantCreationPlan(
  base: CreationBase,
  activeSlots: VariantDraft[]
): CreationPlanItem[] {
  return activeSlots.map((slot) => {
    const generatedCode = normalizeVariantCode(`${base.codigoBase}-${slot.index + 1}`);
    if (!isValidVariantCode(generatedCode)) {
      throw new Error(`Código inválido para Color ${slot.index + 1}. Reduce el código base.`);
    }
    const tallaStockFiltered = Object.fromEntries(
      Object.entries(slot.tallaStock).filter(([, qty]) => qty > 0)
    );
    const descripcionVariante = slot.descripcion?.trim();
    const descripcionFinal = (descripcionVariante || base.descripcion).trim();
    const colorForRow = slot.color.trim();
    const colorStock = buildColorStockForVariant(colorForRow, tallaStockFiltered);
    const product: Omit<Product, "id"> = {
      nombre: base.nombre.trim(),
      precio: base.precio,
      descripcion: descripcionFinal,
      imagen: slot.imagenes[0] ?? "",
      imagenes: slot.imagenes,
      stock: slot.totalStock,
      categoria: base.categoria,
      tipoCalzado: base.tipoCalzado?.trim() || "",
      tallas: sizesFromTallaStock(slot.tallaStock),
      tallaStock: tallaStockFiltered,
      ...(colorStock ? { colorStock } : {}),
      marca: base.marca.trim(),
      material: base.material?.trim() || undefined,
      estilo: base.estilo?.trim() || undefined,
      color: colorForRow,
      familiaId: base.familiaId,
      destacado: base.destacado,
      activo: slot.activo ?? base.activo ?? true,
      descuento: base.descuento,
      campana: base.campana,
    };
    return { generatedCode, product };
  });
}

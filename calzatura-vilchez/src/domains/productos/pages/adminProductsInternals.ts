import type { Product, ProductFinancial } from "@/types";
import { createProductVariantsAtomic, updateProductAtomic } from "@/domains/productos/services/products";
import { buildColorStockForVariant } from "@/utils/colorStockPayload";
import { calculatePriceRange } from "@/domains/ventas/services/finance";
import { capitalizeWords } from "@/utils/colors";
import { sumSizeStock } from "@/utils/stock";
import { normalizeCloudinaryImageUrl } from "@/domains/administradores/services/cloudinary";
import {
  describeCommercialDraftError,
  footwearTypesForCategory,
  normalizeEstiloField,
  sizesForCategory,
  validateCommercialProductDraft,
} from "@/domains/productos/utils/commercialRules";
import { buildVariantCreationPlan, isValidVariantCode, normalizeVariantCode } from "@/domains/productos/utils/variantCreation";
import toast from "react-hot-toast";

export type AdminProduct = Product & { codigo?: string; finanzas?: ProductFinancial };
export type ProductForm = Omit<Product, "id"> & {
  codigo: string;
  costoCompra: number;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  tallaStock: Record<string, number>;
};
export type VariantSlot = {
  color: string;
  imagenes: string[];
  tallaStock: Record<string, number>;
  /** Descripción solo para esta variante; vacío → se usa la descripción común del formulario. */
  descripcion: string;
  activo: boolean;
};

export const LOW_STOCK_LIMIT = 5;
export const IMAGE_SLOTS = 2;
export const COLOR_SLOT_COUNT = 5;
export const FALLBACK_PRODUCT_IMAGE = "/placeholder-product.svg";
export const COLOR_PALETTE = [
  { name: "Negro", hex: "#111111" },
  { name: "Blanco", hex: "#f4f1e8" },
  { name: "Nude", hex: "#d9d4ad" },
  { name: "Camel", hex: "#c77b18" },
  { name: "Multicolor", hex: "linear-gradient(90deg, #ff0000 0%, #ff8c00 16%, #ffe600 33%, #00c853 50%, #00b0ff 66%, #304ffe 83%, #d500f9 100%)" },
  { name: "Gris", hex: "#8d8d8d" },
  { name: "Dorado", hex: "#c9a227" },
  { name: "Plata", hex: "#c7c7c7" },
  { name: "Morado", hex: "#a349c4" },
  { name: "Azul Claro", hex: "#a7cbdd" },
  { name: "Azul", hex: "#3f46c9" },
  { name: "Verde", hex: "#189c1f" },
  { name: "Chocolate", hex: "#a87012" },
  { name: "Marrón", hex: "#915d38" },
  { name: "Rojo", hex: "#ff2f1f" },
  { name: "Rosa", hex: "#e5b0b2" },
  { name: "Café Claro", hex: "#d2b254" },
  { name: "Guinda", hex: "#7b2432" },
  { name: "Petróleo Oscuro", hex: "#2f535d" },
  { name: "Rose Gold", hex: "#d9c2b2" },
];

export const EMPTY_FORM: ProductForm = {
  codigo: "",
  nombre: "",
  precio: 0,
  descripcion: "",
  imagen: "",
  imagenes: [],
  stock: 0,
  categoria: "",
  tipoCalzado: "",
  tallas: [],
  tallaStock: {},
  marca: "",
  material: "",
  estilo: "",
  color: "",
  destacado: false,
  activo: true,
  descuento: undefined,
  campana: undefined,
  costoCompra: 0,
  margenMinimo: 25,
  margenObjetivo: 45,
  margenMaximo: 75,
  familiaId: "",
};

export function sanitizeDecimal(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  const decimal = decimals.join("").slice(0, 2);
  return decimal ? `${integer || "0"}.${decimal}` : integer;
}

export function toPositiveNumber(value: string) {
  const sanitized = sanitizeDecimal(value);
  return sanitized ? Number(sanitized) : 0;
}

export function toPositiveInteger(value: string) {
  const sanitized = value.replace(/\D/g, "");
  return sanitized ? Number(sanitized) : 0;
}

export function normalizeImageSlots(images?: string[], fallback = "") {
  let source: string[];
  if (images && images.length > 0) {
    source = images;
  } else if (fallback) {
    source = [fallback];
  } else {
    source = [];
  }
  return Array.from({ length: IMAGE_SLOTS }, (_, index) => source[index] ?? "");
}

export function editableImageSlots(images?: string[], fallback = "") {
  return Array.from({ length: IMAGE_SLOTS }, (_, index) => images?.[index] ?? (index === 0 ? fallback : ""));
}

export function filterStockByCategory(tallaStock: Record<string, number>, category: string) {
  const sizes = sizesForCategory(category);
  if (!sizes.length) return {};
  const allowed = new Set(sizes);
  return Object.fromEntries(Object.entries(tallaStock).filter(([size]) => allowed.has(size)));
}

export function sizesFromStock(tallaStock: Record<string, number>) {
  return Object.entries(tallaStock)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size)
    .sort((a, b) => Number(a) - Number(b));
}

export function createEmptyStockForCategory(category: string) {
  return Object.fromEntries(sizesForCategory(category).map((size) => [size, 0])) as Record<string, number>;
}

export function createVariantSlots(category: string): VariantSlot[] {
  return Array.from({ length: COLOR_SLOT_COUNT }, () => ({
    color: "",
    imagenes: normalizeImageSlots(),
    tallaStock: createEmptyStockForCategory(category),
    descripcion: "",
    activo: true,
  }));
}

export function getColorHex(colorName: string): string {
  const found = COLOR_PALETTE.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
  return found?.hex ?? "#888888";
}

/** Excluye metadatos de admin sin usar el operador `void` en variables descartadas (Sonar). */
export function omitProductMetaForForm(product: AdminProduct): Omit<AdminProduct, "id" | "finanzas" | "codigo"> {
  const rest = { ...product } as Record<string, unknown>;
  delete rest.id;
  delete rest.finanzas;
  delete rest.codigo;
  return rest as Omit<AdminProduct, "id" | "finanzas" | "codigo">;
}

export function remapVariantSlotsStockForCategory(slots: VariantSlot[], categoria: string): VariantSlot[] {
  const allowed = new Set(sizesForCategory(categoria));
  return slots.map((slot) => {
    const nextStock = Object.fromEntries(
      sizesForCategory(categoria).map((size) => [
        size,
        allowed.has(size) ? Math.max(0, Number(slot.tallaStock[size]) || 0) : 0,
      ]),
    ) as Record<string, number>;
    return { ...slot, tallaStock: nextStock };
  });
}

export type ActiveVariantSlot = {
  index: number;
  color: string;
  imagenes: string[];
  tallaStock: Record<string, number>;
  totalStock: number;
  descripcion: string;
  activo: boolean;
};

export function buildActiveVariantSlots(variantSlots: VariantSlot[], categoria: string): ActiveVariantSlot[] {
  return variantSlots
    .map((slot, index) => {
      const color = capitalizeWords(slot.color ?? "");
      const imagenes = normalizeImageSlots(slot.imagenes)
        .map(normalizeCloudinaryImageUrl)
        .filter(Boolean);
      const tallaStock = filterStockByCategory(slot.tallaStock, categoria);
      const totalStock = sumSizeStock(tallaStock);
      return {
        index,
        color,
        imagenes,
        tallaStock,
        totalStock,
        descripcion: slot.descripcion,
        activo: slot.activo,
      };
    })
    .filter((slot) => slot.color || slot.imagenes.length > 0 || slot.totalStock > 0);
}

export function validateActiveVariantSlotsForCreate(activeSlots: ActiveVariantSlot[]): string | null {
  if (activeSlots.length === 0) {
    return "Completa al menos un bloque de color (1 a 5)";
  }
  const normalizedColors = activeSlots.map((slot) => slot.color.toLowerCase()).filter(Boolean);
  if (new Set(normalizedColors).size !== normalizedColors.length) {
    return "No repitas colores entre variantes";
  }
  for (const slot of activeSlots) {
    if (!slot.color) {
      return `Color ${slot.index + 1}: registra el color`;
    }
    if (slot.totalStock <= 0) {
      return `Color ${slot.index + 1}: registra al menos una talla con stock`;
    }
    if (slot.imagenes.length === 0) {
      return `Color ${slot.index + 1}: agrega al menos una imagen`;
    }
  }
  return null;
}

export function buildExistingCodesSet(products: AdminProduct[], editingId: string | null): Set<string> {
  return new Set(
    products
      .filter((product) => product.id !== editingId)
      .map((product) => normalizeVariantCode(product.codigo ?? ""))
      .filter(Boolean),
  );
}

export function validateProductSaveForm(args: {
  codigo: string;
  form: ProductForm;
  editingId: string | null;
  products: AdminProduct[];
}): string | null {
  const { codigo, form, editingId, products } = args;
  if (!isValidVariantCode(codigo)) {
    return "El código debe tener 3 a 40 caracteres: letras, números o guiones";
  }
  const existingCodes = buildExistingCodesSet(products, editingId);
  if (existingCodes.has(codigo)) {
    return `El código "${codigo}" ya existe en otro producto`;
  }
  if (!form.nombre.trim() || form.precio <= 0) {
    return "Nombre y precio son requeridos";
  }
  if (!form.categoria || !sizesForCategory(form.categoria).length) {
    return "Selecciona la categoría del producto";
  }
  if (!form.marca?.trim()) {
    return "La marca es obligatoria";
  }
  if (!form.tipoCalzado?.trim()) {
    return "Selecciona el tipo de calzado";
  }
  if (!footwearTypesForCategory(form.categoria).includes(form.tipoCalzado.trim())) {
    return "Selecciona un tipo de calzado acorde a la categoría";
  }
  if (form.costoCompra <= 0) {
    return "Registra el costo real de compra";
  }
  if (form.margenMinimo > form.margenObjetivo || form.margenObjetivo > form.margenMaximo) {
    return "Ordena los márgenes: mínimo, objetivo y máximo";
  }
  const range = calculatePriceRange(
    form.costoCompra,
    form.margenMinimo,
    form.margenObjetivo,
    form.margenMaximo,
  );
  if (form.precio < range.precioMinimo || form.precio > range.precioMaximo) {
    return "El precio público debe estar dentro del rango óptimo de venta";
  }
  const estiloNorm = normalizeEstiloField(form.estilo);
  const commercialErrors = validateCommercialProductDraft({
    categoria: form.categoria,
    tipoCalzado: form.tipoCalzado,
    estilo: estiloNorm,
    precio: form.precio,
    costoCompra: form.costoCompra,
    margenMinimo: form.margenMinimo,
    margenObjetivo: form.margenObjetivo,
    margenMaximo: form.margenMaximo,
    material: form.material,
  });
  if (commercialErrors.length > 0) {
    return commercialErrors[0];
  }
  return null;
}

export function validateEditProductPayload(form: ProductForm): string | null {
  const imagenes = normalizeImageSlots(form.imagenes, form.imagen).map(normalizeCloudinaryImageUrl).filter(Boolean);
  const tallaStock = filterStockByCategory(form.tallaStock, form.categoria);
  const totalStock = sumSizeStock(tallaStock);
  const color = capitalizeWords(form.color ?? "");
  if (!color) {
    return "Registra el color del producto";
  }
  if (totalStock <= 0) {
    return "Registra al menos una talla con stock";
  }
  if (imagenes.length === 0) {
    return "Agrega al menos una imagen del producto";
  }
  return null;
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== "object") return "";
  const fields = ["message", "details", "hint", "error", "description"] as const;
  return fields
    .map((field) => (err as Record<string, unknown>)[field])
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function errorStatus(err: unknown): number {
  if (!err || typeof err !== "object") return 0;
  const record = err as Record<string, unknown>;
  const directStatus = Number(record.status ?? record.statusCode);
  if (Number.isFinite(directStatus)) return directStatus;
  const cause = record.cause;
  if (cause && typeof cause === "object") {
    const causeStatus = Number((cause as Record<string, unknown>).status ?? (cause as Record<string, unknown>).statusCode);
    if (Number.isFinite(causeStatus)) return causeStatus;
  }
  return 0;
}

export function toastFromSaveError(err: unknown): string {
  const msg = errorText(err);
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
  const status = errorStatus(err);
  const lowerMsg = `${msg} ${code}`.toLowerCase();
  const isPermissionError = code === "42501" || lowerMsg.includes("row-level security");
  const isUnauthorizedError =
    status === 401 ||
    code === "401" ||
    lowerMsg.includes("401") ||
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("jwt") ||
    lowerMsg.includes("invalid token");
  const isMissingRpcError =
    code === "PGRST202" ||
    lowerMsg.includes("could not find the function") ||
    (lowerMsg.includes("function") && lowerMsg.includes("not found"));
  const isUniqueCodeError =
    code === "23505" ||
    lowerMsg.includes("duplicate key value") ||
    lowerMsg.includes("unique");
  const commercialError = describeCommercialDraftError(err);
  if (msg === "TIMEOUT") {
    return "Tiempo agotado. Inténtalo de nuevo o revisa tu conexión.";
  }
  if (isUniqueCodeError) {
    return "Código duplicado: usa un código único para este producto";
  }
  if (commercialError) {
    return commercialError;
  }
  if (isPermissionError) {
    return "Sin permisos para realizar esta operación.";
  }
  if (isUnauthorizedError) {
    return "Sesión sin autorización para realizar esta operación.";
  }
  if (isMissingRpcError) {
    return "Operación no disponible en la base de datos. Aplica las migraciones pendientes.";
  }
  return `Error: ${msg || "no se pudo guardar el producto"}`;
}

export type AdminProductSaveFlowContext = {
  codigo: string;
  form: ProductForm;
  editingId: string | null;
  products: AdminProduct[];
  variantSlots: VariantSlot[];
  setSaving: (value: boolean) => void;
  closeModal: () => void;
  load: () => void | Promise<void>;
};

async function persistAdminProductEdit(input: {
  editingId: string;
  form: ProductForm;
  codigo: string;
  familiaId: string;
  financialPayload: ReturnType<typeof calculatePriceRange> & { costoCompra: number };
}): Promise<void> {
  const { editingId, form, codigo, familiaId, financialPayload } = input;
  const imagenes = normalizeImageSlots(form.imagenes, form.imagen)
    .map(normalizeCloudinaryImageUrl)
    .filter(Boolean);
  const tallaStock = filterStockByCategory(form.tallaStock, form.categoria);
  const totalStock = sumSizeStock(tallaStock);
  const color = capitalizeWords(form.color ?? "");
  const colorStock = buildColorStockForVariant(color, tallaStock);
  const payload: Omit<Product, "id"> = {
    nombre: form.nombre.trim(),
    precio: form.precio,
    descripcion: form.descripcion.trim(),
    imagen: imagenes[0] ?? "",
    imagenes,
    stock: totalStock,
    categoria: form.categoria,
    tipoCalzado: form.tipoCalzado?.trim() ?? "",
    tallas: sizesFromStock(tallaStock),
    tallaStock: Object.fromEntries(Object.entries(tallaStock).filter(([, qty]) => qty > 0)),
    ...(colorStock ? { colorStock } : {}),
    marca: form.marca?.trim() ?? "",
    material: form.material?.trim() || undefined,
    estilo: normalizeEstiloField(form.estilo),
    color,
    familiaId,
    destacado: form.destacado,
    activo: form.activo ?? true,
    descuento: form.descuento,
    campana: form.campana,
  };
  await updateProductAtomic(editingId, payload, codigo, financialPayload);
}

export function tryBuildVariantCreationBatch(input: {
  codigo: string;
  familiaId: string;
  form: ProductForm;
  variantSlots: VariantSlot[];
  products: AdminProduct[];
  editingId: string | null;
  financialPayload: ReturnType<typeof calculatePriceRange> & { costoCompra: number };
}):
  | { ok: true; variantInput: { product: Omit<Product, "id">; codigo: string; finanzas: typeof input.financialPayload }[]; variantCount: number }
  | { ok: false; duplicateCode: string } {
  const { codigo, familiaId, form, variantSlots, products, editingId, financialPayload } = input;
  const activeSlots = buildActiveVariantSlots(variantSlots, form.categoria);
  const existingCodes = buildExistingCodesSet(products, editingId);
  const createPlan = buildVariantCreationPlan(
    {
      codigoBase: codigo,
      familiaId,
      nombre: form.nombre,
      precio: form.precio,
      descripcion: form.descripcion,
      categoria: form.categoria,
      tipoCalzado: form.tipoCalzado ?? "",
      marca: form.marca?.trim() ?? "",
      material: form.material,
      estilo: normalizeEstiloField(form.estilo),
      destacado: form.destacado,
      activo: form.activo ?? true,
      descuento: form.descuento,
      campana: form.campana,
    },
    activeSlots,
  );
  const generatedCodes = createPlan.map((item) => normalizeVariantCode(item.generatedCode));
  const duplicatedGenerated = generatedCodes.find((genCode) => existingCodes.has(genCode));
  if (duplicatedGenerated) {
    return { ok: false, duplicateCode: duplicatedGenerated };
  }
  const variantInput = createPlan.map(({ generatedCode, product: payload }) => ({
    product: payload,
    codigo: generatedCode,
    finanzas: financialPayload,
  }));
  return { ok: true, variantInput, variantCount: activeSlots.length };
}

export async function runAdminProductSaveFlow(ctx: AdminProductSaveFlowContext): Promise<void> {
  const { codigo, form, editingId, products, variantSlots, setSaving, closeModal, load } = ctx;

  const formError = validateProductSaveForm({ codigo, form, editingId, products });
  if (formError) {
    toast.error(formError);
    return;
  }

  if (editingId) {
    const editErr = validateEditProductPayload(form);
    if (editErr) {
      toast.error(editErr);
      return;
    }
  } else {
    const activeSlots = buildActiveVariantSlots(variantSlots, form.categoria);
    const slotErr = validateActiveVariantSlotsForCreate(activeSlots);
    if (slotErr) {
      toast.error(slotErr);
      return;
    }
  }

  const range = calculatePriceRange(
    form.costoCompra,
    form.margenMinimo,
    form.margenObjetivo,
    form.margenMaximo,
  );

  setSaving(true);
  try {
    const familiaId =
      editingId == null
        ? (form.familiaId?.trim() || crypto.randomUUID())
        : (form.familiaId?.trim() || editingId);
    const financialPayload = { costoCompra: form.costoCompra, ...range };

    if (editingId) {
      await persistAdminProductEdit({ editingId, form, codigo, familiaId, financialPayload });
      toast.success("Producto actualizado");
    } else {
      const batch = tryBuildVariantCreationBatch({
        codigo,
        familiaId,
        form,
        variantSlots,
        products,
        editingId,
        financialPayload,
      });
      if (!batch.ok) {
        toast.error(`El código generado "${batch.duplicateCode}" ya existe. Cambia el código base.`);
        return;
      }
      await createProductVariantsAtomic(batch.variantInput);
      toast.success(`${batch.variantCount} variante(s) creadas`);
    }
    closeModal();
    load();
  } catch (err: unknown) {
    toast.error(toastFromSaveError(err));
  } finally {
    setSaving(false);
  }
}

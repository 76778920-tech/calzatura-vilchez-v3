import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Copy,
  Link as LinkIcon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createProductVariantsAtomic,
  deleteProduct,
  deleteProductCode,
  fetchProductCodes,
  fetchProducts,
  updateProductAtomic,
} from "@/domains/productos/services/products";
import {
  calculatePriceRange,
  deleteProductFinancial,
  fetchProductFinancials,
} from "@/domains/ventas/services/finance";
import type { Product, ProductFinancial } from "@/types";
import { capitalizeWords } from "@/utils/colors";
import { categoryLabel } from "@/utils/labels";
import { sumSizeStock } from "@/utils/stock";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import {
  compressImageFile,
  isCloudinaryImageUrl,
  normalizeCloudinaryImageUrl,
  uploadImageToCloudinary,
} from "@/domains/administradores/services/cloudinary";
import {
  CATEGORIAS,
  MATERIAL_PRESETS,
  STYLE_OPTIONS,
  describeCommercialDraftError,
  footwearTypesForCategory,
  normalizeAdminCategory,
  normalizeEstiloField,
  orderedStyleTokensFromCsv,
  sizesForCategory,
  validateCommercialProductDraft,
} from "@/domains/productos/utils/commercialRules";
import { buildVariantCreationPlan, isValidVariantCode, normalizeVariantCode } from "@/domains/productos/utils/variantCreation";
import { IMAGE_RULES, imageValidationMessage, validateImageFile, validateImageUrlDimensions } from "@/domains/productos/utils/imageRules";
import toast from "react-hot-toast";

type AdminProduct = Product & { codigo?: string; finanzas?: ProductFinancial };
type ProductForm = Omit<Product, "id"> & {
  codigo: string;
  costoCompra: number;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  tallaStock: Record<string, number>;
};
type VariantSlot = {
  color: string;
  imagenes: string[];
  tallaStock: Record<string, number>;
  /** Descripción solo para esta variante; vacío → se usa la descripción común del formulario. */
  descripcion: string;
  activo: boolean;
};

const LOW_STOCK_LIMIT = 5;
const IMAGE_SLOTS = 2;
const COLOR_SLOT_COUNT = 5;
const FALLBACK_PRODUCT_IMAGE = "/placeholder-product.svg";
const COLOR_PALETTE = [
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

const EMPTY_FORM: ProductForm = {
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

type StockFilter = "todos" | "con-stock" | "bajo-stock" | "sin-stock";
type FeaturedFilter = "todos" | "destacados" | "normales";

function sanitizeDecimal(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  const decimal = decimals.join("").slice(0, 2);
  return decimal ? `${integer || "0"}.${decimal}` : integer;
}

function toPositiveNumber(value: string) {
  const sanitized = sanitizeDecimal(value);
  return sanitized ? Number(sanitized) : 0;
}

function toPositiveInteger(value: string) {
  const sanitized = value.replace(/\D/g, "");
  return sanitized ? Number(sanitized) : 0;
}

function normalizeImageSlots(images?: string[], fallback = "") {
  const source = images && images.length > 0 ? images : fallback ? [fallback] : [];
  return Array.from({ length: IMAGE_SLOTS }, (_, index) => source[index] ?? "");
}

function editableImageSlots(images?: string[], fallback = "") {
  return Array.from({ length: IMAGE_SLOTS }, (_, index) => images?.[index] ?? (index === 0 ? fallback : ""));
}

function filterStockByCategory(tallaStock: Record<string, number>, category: string) {
  const sizes = sizesForCategory(category);
  if (!sizes.length) return {};
  const allowed = new Set(sizes);
  return Object.fromEntries(Object.entries(tallaStock).filter(([size]) => allowed.has(size)));
}

function sizesFromStock(tallaStock: Record<string, number>) {
  return Object.entries(tallaStock)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size)
    .sort((a, b) => Number(a) - Number(b));
}

function createEmptyStockForCategory(category: string) {
  return Object.fromEntries(sizesForCategory(category).map((size) => [size, 0])) as Record<string, number>;
}

function createVariantSlots(category: string): VariantSlot[] {
  return Array.from({ length: COLOR_SLOT_COUNT }, () => ({
    color: "",
    imagenes: normalizeImageSlots(),
    tallaStock: createEmptyStockForCategory(category),
    descripcion: "",
    activo: true,
  }));
}

function getColorHex(colorName: string): string {
  const found = COLOR_PALETTE.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
  return found?.hex ?? "#888888";
}

/** Excluye metadatos de admin sin usar el operador `void` en variables descartadas (Sonar). */
function omitProductMetaForForm(product: AdminProduct): Omit<AdminProduct, "id" | "finanzas" | "codigo"> {
  const rest = { ...product } as Record<string, unknown>;
  delete rest.id;
  delete rest.finanzas;
  delete rest.codigo;
  return rest as Omit<AdminProduct, "id" | "finanzas" | "codigo">;
}

function remapVariantSlotsStockForCategory(slots: VariantSlot[], categoria: string): VariantSlot[] {
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

type ActiveVariantSlot = {
  index: number;
  color: string;
  imagenes: string[];
  tallaStock: Record<string, number>;
  totalStock: number;
  descripcion: string;
  activo: boolean;
};

function buildActiveVariantSlots(variantSlots: VariantSlot[], categoria: string): ActiveVariantSlot[] {
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

function validateActiveVariantSlotsForCreate(activeSlots: ActiveVariantSlot[]): string | null {
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

function buildExistingCodesSet(products: AdminProduct[], editingId: string | null): Set<string> {
  return new Set(
    products
      .filter((product) => product.id !== editingId)
      .map((product) => normalizeVariantCode(product.codigo ?? ""))
      .filter(Boolean),
  );
}

function validateProductSaveForm(args: {
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

function validateEditProductPayload(form: ProductForm): string | null {
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

function toastFromSaveError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
  const isPermissionError = code === "42501" || msg.toLowerCase().includes("row-level security");
  const isUniqueCodeError =
    code === "23505" ||
    msg.toLowerCase().includes("duplicate key value") ||
    msg.toLowerCase().includes("unique");
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
  return `Error: ${msg || "no se pudo guardar el producto"}`;
}

type AdminProductSaveFlowContext = {
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

function tryBuildVariantCreationBatch(input: {
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

async function runAdminProductSaveFlow(ctx: AdminProductSaveFlowContext): Promise<void> {
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
      editingId != null
        ? (form.familiaId?.trim() || editingId)
        : (form.familiaId?.trim() || crypto.randomUUID());
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

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [variantSlots, setVariantSlots] = useState<VariantSlot[]>(() => createVariantSlots(EMPTY_FORM.categoria));
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("todos");
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);
  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [estiloSelectOpen, setEstiloSelectOpen] = useState(false);
  const [activeColorSlot, setActiveColorSlot] = useState<number | null>(null);
  const [isDraggingVariants, setIsDraggingVariants] = useState(false);
  const [popoverAbove, setPopoverAbove] = useState(false);
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const colorPaletteRef = useRef<HTMLDivElement | null>(null);
  const estiloSelectRef = useRef<HTMLDivElement | null>(null);
  const activeColorSlotRef = useRef<HTMLDivElement | null>(null);
  const variantsCarouselRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const variantsDragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const load = () => {
    setLoading(true);
    Promise.all([fetchProducts(), fetchProductCodes(), fetchProductFinancials()])
      .then(([items, codes, financials]) => {
        setProducts(items.map((item) => ({
          ...item,
          codigo: codes[item.id] ?? "",
          categoria: normalizeAdminCategory(item.categoria),
          finanzas: financials[item.id],
        })));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useProductsRealtime(load);

  useEffect(() => {
    if (!colorPaletteOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (colorPaletteRef.current?.contains(event.target as Node)) return;
      setColorPaletteOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [colorPaletteOpen]);

  useEffect(() => {
    if (!estiloSelectOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (estiloSelectRef.current?.contains(event.target as Node)) return;
      setEstiloSelectOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [estiloSelectOpen]);

  useEffect(() => {
    if (activeColorSlot === null) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (activeColorSlotRef.current?.contains(event.target as Node)) return;
      setActiveColorSlot(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [activeColorSlot]);

  useEffect(() => {
    if (!isDraggingVariants) return undefined;
    const handleMouseUp = () => {
      variantsDragStateRef.current.active = false;
      setIsDraggingVariants(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDraggingVariants]);

  useEffect(() => {
    if (!showModal || !modalRef.current) return;
    const first = modalRef.current.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
    );
    first?.focus();
  }, [showModal]);

  const closeModal = () => {
    setEstiloSelectOpen(false);
    setShowModal(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab" || !modalRef.current) return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  const isInteractiveDragTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button, input, textarea, select, a, label, [role='button']"));
  };

  const handleVariantsMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveDragTarget(event.target)) return;
    const carousel = variantsCarouselRef.current;
    if (!carousel) return;
    variantsDragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: carousel.scrollLeft,
      scrollTop: carousel.scrollTop,
    };
    setIsDraggingVariants(true);
    event.preventDefault();
  };

  const handleVariantsMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const carousel = variantsCarouselRef.current;
    const drag = variantsDragStateRef.current;
    if (!carousel || !drag.active) return;
    const deltaY = event.clientY - drag.startY;
    const deltaX = event.clientX - drag.startX;
    carousel.scrollTop = drag.scrollTop - deltaY;
    carousel.scrollLeft = drag.scrollLeft - deltaX;
  };

  const stopVariantsDrag = () => {
    if (!variantsDragStateRef.current.active) return;
    variantsDragStateRef.current.active = false;
    setIsDraggingVariants(false);
  };

  const stats = useMemo(() => {
    const bajoStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_LIMIT).length;
    const destacados = products.filter((p) => p.destacado).length;
    const stockTotal = products.reduce((sum, p) => sum + p.stock, 0);
    return { bajoStock, destacados, stockTotal };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const searchable = [
        product.codigo,
        product.nombre,
        product.marca,
        product.material,
        product.color,
        product.categoria,
        product.tipoCalzado,
        categoryLabel(product.categoria),
        product.descripcion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = term === "" || searchable.includes(term);
      const matchesCategory = categoryFilter === "todos" || product.categoria === categoryFilter;
      const matchesStock =
        stockFilter === "todos" ||
        (stockFilter === "con-stock" && product.stock > LOW_STOCK_LIMIT) ||
        (stockFilter === "bajo-stock" && product.stock > 0 && product.stock <= LOW_STOCK_LIMIT) ||
        (stockFilter === "sin-stock" && product.stock === 0);
      const matchesFeatured =
        featuredFilter === "todos" ||
        (featuredFilter === "destacados" && Boolean(product.destacado)) ||
        (featuredFilter === "normales" && !product.destacado);

      return matchesSearch && matchesCategory && matchesStock && matchesFeatured;
    });
  }, [products, searchTerm, categoryFilter, stockFilter, featuredFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    categoryFilter !== "todos" ||
    stockFilter !== "todos" ||
    featuredFilter !== "todos";

  const formPriceRange = useMemo(
    () => calculatePriceRange(
      form.costoCompra,
      form.margenMinimo,
      form.margenObjetivo,
      form.margenMaximo
    ),
    [form.costoCompra, form.margenMinimo, form.margenObjetivo, form.margenMaximo]
  );

  const currentImages = normalizeImageSlots(form.imagenes, form.imagen);
  const currentStock = sumSizeStock(form.tallaStock);
  const variantTotalStock = useMemo(
    () => variantSlots.reduce((sum, slot) => sum + sumSizeStock(slot.tallaStock), 0),
    [variantSlots]
  );
  const isMultiColorCreate = !editingId && variantSlots.some((s) => Boolean(s.color));
  const estiloChipTokens = useMemo(() => orderedStyleTokensFromCsv(form.estilo), [form.estilo]);
  const estiloSummaryLabel = estiloChipTokens.length === 0 ? "Sin estilo" : estiloChipTokens.join(", ");
  const toggleEstiloOption = (opt: (typeof STYLE_OPTIONS)[number]) => {
    const next = new Set(estiloChipTokens);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    const nextOrdered = STYLE_OPTIONS.filter((name) => next.has(name));
    setForm({
      ...form,
      estilo: nextOrdered.length ? nextOrdered.join(",") : undefined,
    });
  };
  const currentSizes = sizesForCategory(form.categoria);
  const currentFootwearTypes = footwearTypesForCategory(form.categoria);

  const setSlotColor = (slotIndex: number, color: string) => {
    const normalizedColor = capitalizeWords(color || "");
    const isDuplicated = Boolean(
      normalizedColor &&
      variantSlots.some((slot, i) => i !== slotIndex && slot.color.toLowerCase() === normalizedColor.toLowerCase())
    );
    if (isDuplicated) {
      toast.error(`"${normalizedColor}" ya está seleccionado en otro color`);
      return;
    }
    setVariantSlots((prev) =>
      prev.map((slot, i) => {
        if (i === slotIndex) return { ...slot, color: normalizedColor };
        if (i > slotIndex && !normalizedColor)
          return {
            color: "",
            imagenes: normalizeImageSlots(),
            tallaStock: createEmptyStockForCategory(form.categoria),
            descripcion: "",
            activo: true,
          };
        return slot;
      })
    );
    setActiveColorSlot(null);
  };

  const openCreate = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingId(null);
    setColorPaletteOpen(false);
    setEstiloSelectOpen(false);
    setActiveColorSlot(null);
    const categoria = EMPTY_FORM.categoria;
    setForm({ ...EMPTY_FORM, imagenes: normalizeImageSlots(), tallaStock: createEmptyStockForCategory(categoria) });
    setVariantSlots(createVariantSlots(categoria));
    setShowModal(true);
  };

  const openEdit = (product: AdminProduct) => {
    triggerRef.current = document.activeElement as HTMLElement;
    const productData = omitProductMetaForForm(product);
    const categoria = normalizeAdminCategory(product.categoria);
    const tallaStock = filterStockByCategory(product.tallaStock ?? {}, categoria);

    setEditingId(product.id);
    setColorPaletteOpen(false);
    setEstiloSelectOpen(false);
    setActiveColorSlot(null);
    setVariantSlots(createVariantSlots(categoria));
    setForm({
      ...EMPTY_FORM,
      ...productData,
      categoria,
      codigo: product.codigo ?? "",
      tallas: sizesFromStock(tallaStock),
      tallaStock,
      stock: sumSizeStock(tallaStock),
      color: capitalizeWords(product.color ?? ""),
      imagenes: normalizeImageSlots(product.imagenes, product.imagen),
      destacado: product.destacado ?? false,
      activo: product.activo ?? true,
      descuento: product.descuento,
      estilo: product.estilo ?? "",
      costoCompra: product.finanzas?.costoCompra ?? 0,
      margenMinimo: product.finanzas?.margenMinimo ?? 25,
      margenObjetivo: product.finanzas?.margenObjetivo ?? 45,
      margenMaximo: product.finanzas?.margenMaximo ?? 75,
      familiaId: product.familiaId?.trim() || product.id,
    });
    setShowModal(true);
  };

  const openVariant = (product: AdminProduct) => {
    triggerRef.current = document.activeElement as HTMLElement;
    const productData = omitProductMetaForForm(product);
    const categoria = normalizeAdminCategory(product.categoria);
    const emptyStock = Object.fromEntries(sizesForCategory(categoria).map((s) => [s, 0]));

    setEditingId(null);
    setColorPaletteOpen(false);
    setEstiloSelectOpen(false);
    setActiveColorSlot(null);
    setVariantSlots(createVariantSlots(categoria));
    setForm({
      ...EMPTY_FORM,
      ...productData,
      categoria,
      codigo: "",
      color: "",
      imagenes: normalizeImageSlots(),
      imagen: "",
      tallaStock: emptyStock,
      tallas: [],
      stock: 0,
      destacado: product.destacado ?? false,
      activo: product.activo ?? true,
      descuento: product.descuento,
      estilo: product.estilo ?? "",
      costoCompra: product.finanzas?.costoCompra ?? 0,
      margenMinimo: product.finanzas?.margenMinimo ?? 25,
      margenObjetivo: product.finanzas?.margenObjetivo ?? 45,
      margenMaximo: product.finanzas?.margenMaximo ?? 75,
      familiaId: product.familiaId?.trim() || product.id,
    });
    setShowModal(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("todos");
    setStockFilter("todos");
    setFeaturedFilter("todos");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const dimError = await validateImageFile(file);
      if (dimError) {
        toast.error(imageValidationMessage(dimError));
        return;
      }
      const compressed = await compressImageFile(file, 1100, 0.78);
      if (compressed.size > IMAGE_RULES.maxCompressedBytes) {
        toast.error(imageValidationMessage("IMAGE_COMPRESSED_TOO_LARGE"));
        return;
      }
      const imageUrl = await uploadImageToCloudinary(compressed, file.name);
      setForm((current) => {
        const imagenes = editableImageSlots(current.imagenes, current.imagen);
        imagenes[index] = imageUrl;
        const cleanImages = imagenes.filter(Boolean);
        return { ...current, imagenes, imagen: cleanImages[0] ?? "" };
      });
    } catch {
      toast.error("No se pudo subir la imagen a Cloudinary");
    } finally {
      setCompressing(false);
      event.target.value = "";
    }
  };

  const updateImageUrl = (index: number, value: string) => {
    const imagenes = editableImageSlots(form.imagenes, form.imagen);
    imagenes[index] = value.trim();
    const cleanImages = imagenes.filter(Boolean);
    setForm({ ...form, imagenes, imagen: cleanImages[0] ?? "" });
  };

  const validateImageUrl = async (index: number, value: string) => {
    const normalized = normalizeCloudinaryImageUrl(value);
    if (!normalized) { updateImageUrl(index, ""); return; }
    try {
      new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    } catch {
      toast.error("Ingresa una URL válida de imagen");
      return;
    }
    updateImageUrl(index, normalized);
    if (isCloudinaryImageUrl(normalized)) {
      const dimError = await validateImageUrlDimensions(normalized);
      if (dimError) {
        updateImageUrl(index, "");
        toast.error(imageValidationMessage(dimError));
      }
    }
  };

  const clearImage = (index: number) => {
    const imagenes = editableImageSlots(form.imagenes, form.imagen);
    imagenes[index] = "";
    const cleanImages = imagenes.filter(Boolean);
    setForm({ ...form, imagenes, imagen: cleanImages[0] ?? "" });
  };

  const updateVariantSlot = (slotIndex: number, updater: (slot: VariantSlot) => VariantSlot) => {
    setVariantSlots((current) =>
      current.map((slot, index) => (index === slotIndex ? updater(slot) : slot))
    );
  };

  const updateVariantSlotImageUrl = (slotIndex: number, imageIndex: number, value: string) => {
    updateVariantSlot(slotIndex, (slot) => {
      const imagenes = [...normalizeImageSlots(slot.imagenes)];
      imagenes[imageIndex] = value.trim();
      return { ...slot, imagenes };
    });
  };

  const validateVariantSlotImageUrl = async (slotIndex: number, imageIndex: number, value: string) => {
    const normalized = normalizeCloudinaryImageUrl(value);
    if (!normalized) {
      updateVariantSlotImageUrl(slotIndex, imageIndex, "");
      return;
    }
    try {
      new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    } catch {
      toast.error("Ingresa una URL válida de imagen");
      return;
    }
    updateVariantSlotImageUrl(slotIndex, imageIndex, normalized);
    if (isCloudinaryImageUrl(normalized)) {
      const dimError = await validateImageUrlDimensions(normalized);
      if (dimError) {
        updateVariantSlotImageUrl(slotIndex, imageIndex, "");
        toast.error(imageValidationMessage(dimError));
      }
    }
  };

  const handleVariantFileChange = async (event: ChangeEvent<HTMLInputElement>, slotIndex: number, imageIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const dimError = await validateImageFile(file);
      if (dimError) {
        toast.error(imageValidationMessage(dimError));
        return;
      }
      const compressed = await compressImageFile(file, 1100, 0.78);
      if (compressed.size > IMAGE_RULES.maxCompressedBytes) {
        toast.error(imageValidationMessage("IMAGE_COMPRESSED_TOO_LARGE"));
        return;
      }
      const imageUrl = await uploadImageToCloudinary(compressed, file.name);
      updateVariantSlot(slotIndex, (slot) => {
        const imagenes = [...normalizeImageSlots(slot.imagenes)];
        imagenes[imageIndex] = imageUrl;
        return { ...slot, imagenes };
      });
    } catch {
      toast.error("No se pudo subir la imagen a Cloudinary");
    } finally {
      setCompressing(false);
      event.target.value = "";
    }
  };

  const updateVariantSlotStock = (slotIndex: number, talla: string, quantity: number) => {
    updateVariantSlot(slotIndex, (slot) => ({
      ...slot,
      tallaStock: { ...slot.tallaStock, [talla]: Math.max(0, Number(quantity) || 0) },
    }));
  };

  const updateTallaStock = (talla: string, quantity: number) => {
    const tallaStock = { ...form.tallaStock, [talla]: Math.max(0, Number(quantity) || 0) };
    setForm({
      ...form,
      tallaStock,
      tallas: sizesFromStock(tallaStock),
      stock: sumSizeStock(tallaStock),
    });
  };

  const updateCategory = (categoria: string) => {
    const tallaStock = filterStockByCategory(form.tallaStock, categoria);
    const validTypes = footwearTypesForCategory(categoria);
    if (!editingId) {
      setVariantSlots((current) => remapVariantSlotsStockForCategory(current, categoria));
    }
    setForm({
      ...form,
      categoria,
      tipoCalzado: validTypes.includes(form.tipoCalzado ?? "") ? form.tipoCalzado : "",
      tallaStock,
      tallas: sizesFromStock(tallaStock),
      stock: sumSizeStock(tallaStock),
    });
  };

  const handleSave = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    const codigo = normalizeVariantCode(form.codigo ?? "");
    await runAdminProductSaveFlow({
      codigo,
      form,
      editingId,
      products,
      variantSlots,
      setSaving,
      closeModal,
      load,
    });
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`¿Eliminar "${product.nombre}"?`)) return;
    try {
      await Promise.all([
        deleteProduct(product.id),
        deleteProductCode(product.id),
        deleteProductFinancial(product.id),
      ]);
      toast.success("Producto eliminado");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Productos</h1>
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <Boxes size={22} />
          <div>
            <span>Total productos</span>
            <strong>{products.length}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <AlertTriangle size={22} />
          <div>
            <span>Stock bajo</span>
            <strong>{stats.bajoStock}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <PackageCheck size={22} />
          <div>
            <span>Stock total</span>
            <strong>{stats.stockTotal}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <Star size={22} />
          <div>
            <span>Destacados</span>
            <strong>{stats.destacados}</strong>
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrapper">
          <Search size={17} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por código, nombre, marca, color, categoría, tipo o descripción"
          />
        </div>
        <div className="admin-filter-grid">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-input">
            <option value="todos">Todas las categorías</option>
            {CATEGORIAS.map((category) => (
              <option key={category} value={category}>{categoryLabel(category)}</option>
            ))}
          </select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="form-input">
            <option value="todos">Todo el stock</option>
            <option value="con-stock">Con stock saludable</option>
            <option value="bajo-stock">Stock bajo</option>
            <option value="sin-stock">Sin stock</option>
          </select>
          <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value as FeaturedFilter)} className="form-input">
            <option value="todos">Todos</option>
            <option value="destacados">Destacados</option>
            <option value="normales">No destacados</option>
          </select>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn-outline admin-clear-filters">
              Limpiar
            </button>
          )}
          <button type="button" onClick={openCreate} className="btn-primary admin-toolbar-create">
            <Plus size={16} /> Producto nuevo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="products-grid">
          {[...Array(6)].map((_, index) => <div key={index} className="skeleton-card" />)}
        </div>
      ) : (
        <div className="admin-table-wrapper product-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Rango venta</th>
                <th>Stock</th>
                <th>Destacado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} className="admin-empty-cell">
                    {products.length === 0
                      ? "No hay productos. Crea el primero."
                      : "No se encontraron productos con esos filtros."}
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-image-thumb-button"
                      onClick={() => setPreviewImage({
                        src: product.imagen || FALLBACK_PRODUCT_IMAGE,
                        title: product.nombre,
                        subtitle: "Producto",
                      })}
                      aria-label={`Abrir imagen de ${product.nombre}`}
                    >
                      <img
                        src={product.imagen || FALLBACK_PRODUCT_IMAGE}
                        alt={product.nombre}
                        className="admin-product-img"
                        onError={(event) => {
                          const img = event.target as HTMLImageElement;
                          img.onerror = null;
                          img.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                    </button>
                  </td>
                  <td><span className="admin-code-badge">{product.codigo || "SIN-CODIGO"}</span></td>
                  <td>
                    <div className="admin-product-cell">
                      <strong>{product.nombre}</strong>
                      <span>
                        {product.marca || "Sin marca"}
                        {product.material ? ` · ${product.material}` : ""}
                        {product.color ? ` · ${product.color}` : ""}
                      </span>
                    </div>
                  </td>
                  <td><span className="admin-soft-badge">{categoryLabel(product.categoria)}</span></td>
                  <td><span className="admin-soft-badge">{product.tipoCalzado || "Sin tipo"}</span></td>
                  <td>S/ {product.precio.toFixed(2)}</td>
                  <td>
                    {product.finanzas ? (
                      <div className="admin-range-cell">
                        <strong>S/ {product.finanzas.precioMinimo.toFixed(2)} - S/ {product.finanzas.precioMaximo.toFixed(2)}</strong>
                        <span>Sugerido: S/ {product.finanzas.precioSugerido.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="admin-status-badge muted">Sin costo</span>
                    )}
                  </td>
                  <td>
                    <span className={product.stock === 0 ? "stock-badge out" : product.stock <= LOW_STOCK_LIMIT ? "stock-badge low" : "stock-badge in"}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={product.destacado ? "admin-status-badge featured" : "admin-status-badge muted"}>
                      {product.destacado ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button onClick={() => openVariant(product)} className="action-btn" title="Crear variante de color" aria-label={`Crear variante de ${product.nombre}`}>
                        <Copy size={14} />
                      </button>
                      <button onClick={() => openEdit(product)} className="action-btn edit-btn" aria-label={`Editar ${product.nombre}`}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(product)} className="action-btn delete-btn" aria-label={`Eliminar ${product.nombre}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className={`modal product-modal${!editingId ? " product-modal--create" : ""}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={trapFocus}
          >
            <div className="modal-header">
              <h2 id="product-modal-title">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={closeModal} className="modal-close" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              <div className="product-form-layout">
                <aside className={`admin-form-card admin-image-card${!editingId ? " admin-variants-card" : ""}`}>
                  <div className="admin-form-card-header">
                    <strong>{editingId ? "Galería" : "Variantes"}</strong>
                    <span className="admin-stock-pill">Stock: <strong>{editingId ? currentStock : variantTotalStock}</strong></span>
                  </div>
                  {editingId ? (
                    <div className="admin-image-grid">
                      {currentImages.map((image, index) => (
                      <div key={index} className="admin-image-slot">
                        <button
                          type="button"
                          className="image-upload-area"
                          onClick={() => {
                            if (compressing) return;
                            if (image) {
                              setPreviewImage({
                                src: image,
                                title: `${form.nombre || "Producto"} - Imagen ${index + 1}`,
                                subtitle: "Galería",
                              });
                              return;
                            }
                            fileInputRefs.current[index]?.click();
                          }}
                          disabled={compressing}
                        >
                          {image ? (
                            <img src={image} alt={`Vista previa ${index + 1}`} className="image-preview" />
                          ) : (
                            <div className="image-upload-placeholder">
                              <Upload size={28} />
                              <span>{compressing ? "Subiendo..." : `Imagen ${index + 1}`}</span>
                              <small>JPG, PNG o WEBP</small>
                            </div>
                          )}
                        </button>
                        <input
                          ref={(element) => { fileInputRefs.current[index] = element; }}
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleFileChange(event, index)}
                          style={{ display: "none" }}
                        />
                        <div className="input-wrapper">
                          <LinkIcon size={14} className="input-icon" />
                          <input
                            type="text"
                            inputMode="url"
                            value={image.startsWith("data:") ? "" : image}
                            onChange={(event) => updateImageUrl(index, event.target.value)}
                            onBlur={(event) => validateImageUrl(index, event.target.value)}
                            placeholder={`URL de imagen ${index + 1}`}
                            className="form-input with-icon with-action"
                          />
                          {image && (
                            <button
                              type="button"
                              className="input-action-btn"
                              onClick={() => clearImage(index)}
                              aria-label={`Quitar imagen ${index + 1}`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {variantSlots.every((s) => !s.color) ? (
                        <div className="admin-variants-empty">
                          <p>Selecciona un color para ver aquí las imágenes de cada variante.</p>
                        </div>
                      ) : (
                        <div
                          ref={variantsCarouselRef}
                          className={`admin-variants-carousel${isDraggingVariants ? " dragging" : ""}`}
                          onMouseDown={handleVariantsMouseDown}
                          onMouseMove={handleVariantsMouseMove}
                          onMouseUp={stopVariantsDrag}
                          onMouseLeave={stopVariantsDrag}
                        >
                          {variantSlots.map((slot, slotIndex) => {
                            if (!slot.color) return null;
                            const slotImages = normalizeImageSlots(slot.imagenes);
                            const colorHex = getColorHex(slot.color);
                            return (
                              <div key={slotIndex} className="admin-variant-carousel-card">
                                <div className="admin-variant-block-header">
                                  <span className="admin-variant-block-label">
                                    <span className="admin-variant-color-dot" style={{ background: colorHex }} />
                                    {slot.color}
                                  </span>
                                  <button
                                    type="button"
                                    className="admin-variant-block-clear"
                                    onClick={() => setSlotColor(slotIndex, "")}
                                    aria-label={`Quitar Color ${slotIndex + 1}`}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                                <div className="admin-image-grid">
                                  {slotImages.map((image, imageIndex) => (
                                    <div key={imageIndex} className="admin-image-slot">
                                      <button
                                        type="button"
                                        className="image-upload-area"
                                        onClick={() => {
                                          if (compressing) return;
                                          const input = document.getElementById(`variant-upload-${slotIndex}-${imageIndex}`) as HTMLInputElement | null;
                                          input?.click();
                                        }}
                                        disabled={compressing}
                                      >
                                        {image ? (
                                          <img src={image} alt={`Color ${slotIndex + 1} imagen ${imageIndex + 1}`} className="image-preview" />
                                        ) : (
                                          <div className="image-upload-placeholder">
                                            <Upload size={22} />
                                            <span>{compressing ? "Subiendo..." : `Imagen ${imageIndex + 1}`}</span>
                                            <small>JPG · PNG · WEBP</small>
                                          </div>
                                        )}
                                      </button>
                                      <input
                                        id={`variant-upload-${slotIndex}-${imageIndex}`}
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => handleVariantFileChange(event, slotIndex, imageIndex)}
                                        style={{ display: "none" }}
                                      />
                                      <div className="input-wrapper">
                                        <LinkIcon size={14} className="input-icon" />
                                        <input
                                          type="text"
                                          inputMode="url"
                                          value={image.startsWith("data:") ? "" : image}
                                          onChange={(event) => updateVariantSlotImageUrl(slotIndex, imageIndex, event.target.value)}
                                          onBlur={(event) => validateVariantSlotImageUrl(slotIndex, imageIndex, event.target.value)}
                                          placeholder={`URL imagen ${imageIndex + 1}`}
                                          className="form-input with-icon"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <details className="admin-variant-details">
                                  <summary>Texto y visibilidad ({slot.color})</summary>
                                  <div className="admin-variant-details-body">
                                    <label className="checkbox-label admin-variant-details-check">
                                      <input
                                        type="checkbox"
                                        checked={slot.activo}
                                        onChange={(event) =>
                                          updateVariantSlot(slotIndex, (s) => ({ ...s, activo: event.target.checked }))
                                        }
                                      />
                                      Visible en tienda (solo este color)
                                    </label>
                                    <label className="admin-variant-details-label" htmlFor={`variant-desc-${slotIndex}`}>
                                      Descripción del color
                                    </label>
                                    <textarea
                                      id={`variant-desc-${slotIndex}`}
                                      value={slot.descripcion}
                                      onChange={(event) =>
                                        updateVariantSlot(slotIndex, (s) => ({ ...s, descripcion: event.target.value }))
                                      }
                                      rows={2}
                                      className="form-input admin-variant-details-textarea"
                                      placeholder="Tonos, material visible en este color, combinaciones…"
                                    />
                                    <p className="admin-variant-details-hint">
                                      Si lo dejas vacío, se usará la descripción común del final del formulario.
                                    </p>
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </aside>

                <div className="product-form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Código interno *</label>
                      <input
                        value={form.codigo ?? ""}
                        onChange={(event) => setForm({ ...form, codigo: normalizeVariantCode(event.target.value) })}
                        required
                        className="form-input"
                        placeholder="CV-FOR-001"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        value={form.nombre}
                        onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                        required
                        className="form-input"
                        placeholder="Zapato formal negro"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Marca *</label>
                      <input
                        value={form.marca ?? ""}
                        onChange={(event) => setForm({ ...form, marca: event.target.value })}
                        required
                        className="form-input"
                        placeholder="Calzatura Vilchez"
                      />
                    </div>
                    <div className="form-group">
                      <label>Material</label>
                      <select
                        value={form.material ?? ""}
                        onChange={(event) => setForm({ ...form, material: event.target.value || undefined })}
                        className="form-input"
                      >
                        <option value="">Sin material</option>
                        {MATERIAL_PRESETS.map((material) => (
                          <option key={material} value={material}>
                            {material}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editingId && (
                    <div className="form-row form-row-single">
                      <div className="form-group">
                        <label>Color *</label>
                        <div className="admin-material-select" ref={colorPaletteRef}>
                          <button
                            type="button"
                            className={`admin-material-trigger ${colorPaletteOpen ? "active" : ""}`}
                            onClick={() => setColorPaletteOpen((current) => !current)}
                            aria-label="Abrir paleta de colores"
                          >
                            <span className="admin-material-trigger-copy">
                              <span className="admin-material-trigger-label">Color</span>
                              <span className="admin-material-trigger-value">{form.color ?? ""}</span>
                            </span>
                            <ChevronDown size={14} />
                          </button>
                          {colorPaletteOpen && (
                            <div className="admin-color-popover" role="dialog" aria-label="Paleta de colores">
                              <div className="admin-color-popover-grid">
                                <button
                                  type="button"
                                  className={`admin-color-popover-item ${!form.color ? "active" : ""}`}
                                  onClick={() => { setForm({ ...form, color: "" }); setColorPaletteOpen(false); }}
                                >
                                  <span className="admin-color-popover-swatch admin-color-popover-swatch-empty" aria-hidden="true" />
                                  <span>Sin color</span>
                                </button>
                                {COLOR_PALETTE.map((preset) => {
                                  const isActive = capitalizeWords(form.color ?? "").toLowerCase() === preset.name.toLowerCase();
                                  return (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      className={`admin-color-popover-item ${isActive ? "active" : ""}`}
                                      onClick={() => { setForm({ ...form, color: preset.name }); setColorPaletteOpen(false); }}
                                    >
                                      <span
                                        className="admin-color-popover-swatch"
                                        style={{ background: preset.hex }}
                                        aria-hidden="true"
                                      />
                                      <span>{preset.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          value={form.color ?? ""}
                          onChange={(event) => setForm({ ...form, color: capitalizeWords(event.target.value) })}
                          className="form-input"
                          list="admin-color-suggestions"
                          placeholder="Escribe un color (ej. Negro, Blanco, Azul Marino)"
                          style={{ marginTop: "0.55rem" }}
                        />
                        <datalist id="admin-color-suggestions">
                          {COLOR_PALETTE.map((preset) => (
                            <option key={preset.name} value={preset.name} />
                          ))}
                        </datalist>
                        <small className="admin-help-text">
                          Si no se abre la paleta o no encuentras el color, escríbelo aquí.
                        </small>
                      </div>
                    </div>
                  )}

                  <div className="form-row product-core-row">
                    <div className="form-group">
                      <label>Categoría</label>
                      <select value={form.categoria} onChange={(event) => updateCategory(event.target.value)} className="form-input" required>
                        <option value="">Selecciona la categoría</option>
                        {CATEGORIAS.map((category) => (
                          <option key={category} value={category}>{categoryLabel(category)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tipo de calzado *</label>
                      <select
                        value={form.tipoCalzado ?? ""}
                        onChange={(event) => setForm({ ...form, tipoCalzado: event.target.value })}
                        required
                        className="form-input"
                        disabled={!form.categoria}
                      >
                        <option value="">Selecciona un tipo</option>
                        {currentFootwearTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label id="admin-estilo-label">Estilo</label>
                      <div className="admin-estilo-dropdown" ref={estiloSelectRef}>
                        <button
                          type="button"
                          className={`admin-estilo-dropdown-trigger${estiloSelectOpen ? " active" : ""}`}
                          aria-haspopup="listbox"
                          aria-expanded={estiloSelectOpen}
                          aria-labelledby="admin-estilo-label"
                          onClick={() => setEstiloSelectOpen((o) => !o)}
                        >
                          <span className="admin-estilo-dropdown-value">{estiloSummaryLabel}</span>
                          <ChevronDown size={18} aria-hidden />
                        </button>
                        {estiloSelectOpen && (
                          <div
                            className="admin-estilo-dropdown-panel"
                            role="listbox"
                            aria-multiselectable="true"
                            aria-labelledby="admin-estilo-label"
                          >
                            {STYLE_OPTIONS.map((opt) => (
                              <label key={opt} className="admin-estilo-check-row" role="option" aria-selected={estiloChipTokens.includes(opt)}>
                                <input
                                  type="checkbox"
                                  checked={estiloChipTokens.includes(opt)}
                                  onChange={() => toggleEstiloOption(opt)}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Precio (S/) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.precio === 0 ? "" : form.precio}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setForm({ ...form, precio: toPositiveNumber(event.target.value) })}
                        required
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="admin-finance-box">
                    <div>
                      <span className="admin-page-kicker admin-finance-kicker">Rentabilidad <span>(Rango óptimo de venta)</span></span>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Costo real de compra (S/) *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.costoCompra === 0 ? "" : form.costoCompra}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => setForm({ ...form, costoCompra: toPositiveNumber(event.target.value) })}
                          required
                          className="form-input"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label>Margen objetivo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenObjetivo}
                          onChange={(event) => setForm({ ...form, margenObjetivo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Margen mínimo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenMinimo}
                          onChange={(event) => setForm({ ...form, margenMinimo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Margen máximo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenMaximo}
                          onChange={(event) => setForm({ ...form, margenMaximo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="admin-price-preview">
                      <span>Mínimo: S/ {formPriceRange.precioMinimo.toFixed(2)}</span>
                      <strong>Sugerido: S/ {formPriceRange.precioSugerido.toFixed(2)}</strong>
                      <span>Máximo: S/ {formPriceRange.precioMaximo.toFixed(2)}</span>
                    </div>
                  </div>

                  {editingId ? (
                    <div className="form-group">
                      <div className="admin-stock-heading">
                        <label>Stock por talla</label>
                      </div>
                      {currentSizes.length === 0 ? (
                        <p className="admin-empty">Selecciona la categoría para ver sus tallas.</p>
                      ) : (
                        <div className="admin-size-stock-grid">
                          {currentSizes.map((size) => (
                            <label key={size} className="admin-size-stock-item">
                              <span>{size}</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={form.tallaStock[size] ?? 0}
                                onChange={(event) => updateTallaStock(size, toPositiveInteger(event.target.value))}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Colores del producto</label>
                      <div className="variant-chips-row">
                        {variantSlots.map((slot, index) => {
                          const isAvailable = index === 0 || Boolean(variantSlots[index - 1].color);
                          const colorHex = slot.color ? getColorHex(slot.color) : null;
                          return (
                            <div
                              key={index}
                              className="variant-chip-wrap"
                              ref={activeColorSlot === index ? activeColorSlotRef : null}
                            >
                              <button
                                type="button"
                                disabled={!isAvailable}
                                className={`variant-chip${slot.color ? " variant-chip--active" : ""}${!isAvailable ? " variant-chip--locked" : ""}`}
                                onClick={(e) => {
                                  if (!isAvailable) return;
                                  if (activeColorSlot === index) { setActiveColorSlot(null); return; }
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setPopoverAbove(window.innerHeight - rect.bottom < 300);
                                  setActiveColorSlot(index);
                                }}
                              >
                                {colorHex ? (
                                  <span className="variant-chip-swatch" style={{ background: colorHex }} />
                                ) : (
                                  <span className="variant-chip-empty-swatch" />
                                )}
                                <span className="variant-chip-label">Color {index + 1}</span>
                                {slot.color && <span className="variant-chip-name">{slot.color}</span>}
                              </button>
                              {activeColorSlot === index && isAvailable && (
                                <div className={`variant-chip-popover${popoverAbove ? " variant-chip-popover--above" : ""}`}>
                                  <div className="admin-color-popover-grid">
                                    <button
                                      type="button"
                                      className={`admin-color-popover-item${!slot.color ? " active" : ""}`}
                                      onClick={() => setSlotColor(index, "")}
                                    >
                                      <span className="admin-color-popover-swatch admin-color-popover-swatch-empty" aria-hidden="true" />
                                      <span>Sin color</span>
                                    </button>
                                    {COLOR_PALETTE.map((preset) => {
                                      const isActive = slot.color.toLowerCase() === preset.name.toLowerCase();
                                      const isUsedByAnotherSlot = variantSlots.some(
                                        (s, i) => i !== index && s.color.toLowerCase() === preset.name.toLowerCase()
                                      );
                                      return (
                                        <button
                                          key={preset.name}
                                          type="button"
                                          disabled={isUsedByAnotherSlot}
                                          className={`admin-color-popover-item${isActive ? " active" : ""}${isUsedByAnotherSlot ? " disabled" : ""}`}
                                          onClick={() => setSlotColor(index, preset.name)}
                                        >
                                          <span className="admin-color-popover-swatch" style={{ background: preset.hex }} aria-hidden="true" />
                                          <span>{preset.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!form.categoria && (
                        <small className="admin-help-text">Selecciona la categoría para habilitar las tallas.</small>
                      )}
                    </div>
                  )}

                  {!editingId && variantSlots.some((s) => s.color) && (
                    <div className="variant-tallas-section">
                      <label>Tallas y stock por color</label>
                      {!form.categoria ? (
                        <p className="admin-empty">Selecciona la categoría para ver las tallas.</p>
                      ) : (
                        <div className="variant-tallas-list">
                          {variantSlots.map((slot, slotIndex) => {
                            if (!slot.color) return null;
                            return (
                              <div key={slotIndex} className="variant-tallas-block">
                                <div className="variant-tallas-block-head">
                                  <span className="admin-variant-color-dot" style={{ background: getColorHex(slot.color) }} />
                                  <span className="variant-tallas-color-name">{slot.color}</span>
                                  <span className="variant-tallas-stock-badge">Stock: {sumSizeStock(slot.tallaStock)}</span>
                                </div>
                                <div className="admin-size-stock-grid">
                                  {currentSizes.map((size) => (
                                    <label key={`t-${slotIndex}-${size}`} className="admin-size-stock-item">
                                      <span>{size}</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={slot.tallaStock[size] ?? 0}
                                        onChange={(event) => updateVariantSlotStock(slotIndex, size, toPositiveInteger(event.target.value))}
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Campaña</label>
                      <select
                        value={form.campana ?? ""}
                        onChange={(event) => setForm({ ...form, campana: event.target.value || undefined })}
                        className="form-input"
                      >
                        <option value="">Sin campaña</option>
                        <option value="lanzamiento">Lanzamiento</option>
                        <option value="nueva-temporada">Nueva Temporada</option>
                        <option value="cyber-wow">Cyber Wow</option>
                        <option value="club-calzado">Club Calzado</option>
                        <option value="outlet">Outlet</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Descuento Cyber Wow</label>
                      <select
                        value={form.descuento ?? ""}
                        onChange={(event) => {
                          const val = event.target.value;
                          setForm({ ...form, descuento: val ? (Number(val) as 10 | 20 | 30) : undefined });
                        }}
                        className="form-input"
                      >
                        <option value="">Sin descuento</option>
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="30">30%</option>
                      </select>
                    </div>
                    <label className="checkbox-label" style={{ alignSelf: "flex-end", paddingBottom: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={form.destacado ?? false}
                        onChange={(event) => setForm({ ...form, destacado: event.target.checked })}
                      />
                      Producto destacado
                    </label>
                    {(editingId || !isMultiColorCreate) && (
                      <label className="checkbox-label" style={{ alignSelf: "flex-end", paddingBottom: "0.5rem" }}>
                        <input
                          type="checkbox"
                          checked={form.activo ?? true}
                          onChange={(event) => setForm({ ...form, activo: event.target.checked })}
                        />
                        Visible en tienda
                      </label>
                    )}
                  </div>

                  {isMultiColorCreate && (
                    <p className="admin-help-text" style={{ marginTop: "-0.25rem", marginBottom: "0.35rem" }}>
                      La visibilidad en tienda es por color: en la columna <strong>Variantes</strong>, abre <strong>Texto y visibilidad</strong> en cada tarjeta.
                    </p>
                  )}

                  <div className="form-group">
                    <label>{isMultiColorCreate ? "Descripción común (respaldo)" : "Descripción"}</label>
                    <textarea
                      value={form.descripcion}
                      onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                      rows={isMultiColorCreate ? 2 : 3}
                      className="form-input"
                      placeholder={
                        isMultiColorCreate
                          ? "Se aplica a los colores que no tengan texto propio…"
                          : "Material, acabado, ocasión de uso..."
                      }
                    />
                    {isMultiColorCreate && (
                      <small className="admin-help-text">
                        Cada color puede tener su propia descripción en <strong>Variantes → Texto y visibilidad</strong>.
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving || compressing} className="btn-primary">
                  {saving ? "Guardando..." : compressing ? "Subiendo imagen..." : editingId ? "Actualizar" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}

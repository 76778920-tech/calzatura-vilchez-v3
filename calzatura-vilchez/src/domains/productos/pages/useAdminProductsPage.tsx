import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  calculatePriceRange,
  deleteProductFinancial,
  fetchProductFinancials,
} from "@/domains/ventas/services/finance";
import {
  deleteProduct,
  deleteProductCode,
  fetchProductCodes,
  fetchProducts,
  registrarIngresoStock,
} from "@/domains/productos/services/products";
import {
  compressImageFile,
  isCloudinaryImageUrl,
  normalizeCloudinaryImageUrl,
  uploadImageToCloudinary,
} from "@/domains/administradores/services/cloudinary";
import {
  footwearTypesForCategory,
  normalizeAdminCategory,
  orderedStyleTokensFromCsv,
  sizesForCategory,
  STYLE_OPTIONS,
} from "@/domains/productos/utils/commercialRules";
import { normalizeVariantCode } from "@/domains/productos/utils/variantCreation";
import { IMAGE_RULES, imageValidationMessage, validateImageFile, validateImageUrlDimensions } from "@/domains/productos/utils/imageRules";
import { capitalizeWords } from "@/utils/colors";
import { sumSizeStock } from "@/utils/stock";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import toast from "react-hot-toast";
import { invalidateAICache } from "@/domains/administradores/predictions/adminPredictionsApi";
import {
  computeAdminProductStats,
  filterAdminProducts,
  hasActiveAdminProductFilters,
  type FeaturedFilter,
  type StockFilter,
} from "./adminProductsListFilters";
import {
  createEmptyStockForCategory,
  createVariantSlots,
  editableImageSlots,
  EMPTY_FORM,
  filterStockByCategory,
  normalizeImageSlots,
  omitProductMetaForForm,
  remapVariantSlotsStockForCategory,
  runAdminProductSaveFlow,
  sizesFromStock,
  LOW_STOCK_LIMIT,
  type AdminProduct,
  type ProductForm,
  type VariantSlot,
} from "./adminProductsInternals";

async function compressAndUploadImage(
  event: ChangeEvent<HTMLInputElement>,
  setCompressing: (v: boolean) => void,
  onSuccess: (imageUrl: string) => void
): Promise<void> {
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
    onSuccess(imageUrl);
  } catch {
    toast.error("No se pudo subir la imagen a Cloudinary");
  } finally {
    setCompressing(false);
    event.target.value = "";
  }
}

async function validateAndApplyImageUrl(
  value: string,
  apply: (normalized: string) => void,
  clear: () => void
): Promise<void> {
  const normalized = normalizeCloudinaryImageUrl(value);
  if (!normalized) { clear(); return; }
  try {
    new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
  } catch {
    toast.error("Ingresa una URL válida de imagen");
    return;
  }
  apply(normalized);
  if (isCloudinaryImageUrl(normalized)) {
    const dimError = await validateImageUrlDimensions(normalized);
    if (dimError) {
      clear();
      toast.error(imageValidationMessage(dimError));
    }
  }
}

export function useAdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState<AdminProduct | null>(null);
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
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const variantsDragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const setFileInputRef = useCallback((index: number) => (element: HTMLInputElement | null) => {
    fileInputRefs.current[index] = element;
  }, []);

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
    const timer = globalThis.setTimeout(load, 0);
    return () => globalThis.clearTimeout(timer);
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
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        variantsDragStateRef.current.active = false;
        setIsDraggingVariants(false);
      }
    };
    globalThis.addEventListener("mouseup", handleMouseUp);
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("mouseup", handleMouseUp);
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
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
    globalThis.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const trapFocus = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab" || !modalRef.current) return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!last) return;
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

  const handleVariantsMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
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

  const handleVariantsMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
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

  const stats = useMemo(
    () => computeAdminProductStats(products, LOW_STOCK_LIMIT),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      filterAdminProducts(products, {
        searchTerm,
        categoryFilter,
        stockFilter,
        featuredFilter,
        lowStockLimit: LOW_STOCK_LIMIT,
      }),
    [products, searchTerm, categoryFilter, stockFilter, featuredFilter],
  );

  const hasActiveFilters = hasActiveAdminProductFilters(
    searchTerm,
    categoryFilter,
    stockFilter,
    featuredFilter,
  );

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, index: number) =>
    compressAndUploadImage(event, setCompressing, (imageUrl) => {
      setForm((current) => {
        const imagenes = editableImageSlots(current.imagenes, current.imagen);
        imagenes[index] = imageUrl;
        const primaryImage = imagenes.find(Boolean) ?? "";
        return { ...current, imagenes, imagen: primaryImage };
      });
    });

  const updateImageUrl = (index: number, value: string) => {
    const imagenes = editableImageSlots(form.imagenes, form.imagen);
    imagenes[index] = value.trim();
    const primaryImage = imagenes.find(Boolean) ?? "";
    setForm({ ...form, imagenes, imagen: primaryImage });
  };

  const validateImageUrl = (index: number, value: string) =>
    validateAndApplyImageUrl(
      value,
      (normalized) => updateImageUrl(index, normalized),
      () => updateImageUrl(index, "")
    );

  const clearImage = (index: number) => {
    const imagenes = editableImageSlots(form.imagenes, form.imagen);
    imagenes[index] = "";
    const primaryImage = imagenes.find(Boolean) ?? "";
    setForm({ ...form, imagenes, imagen: primaryImage });
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

  const validateVariantSlotImageUrl = (slotIndex: number, imageIndex: number, value: string) =>
    validateAndApplyImageUrl(
      value,
      (normalized) => updateVariantSlotImageUrl(slotIndex, imageIndex, normalized),
      () => updateVariantSlotImageUrl(slotIndex, imageIndex, "")
    );

  const handleVariantFileChange = (event: ChangeEvent<HTMLInputElement>, slotIndex: number, imageIndex: number) =>
    compressAndUploadImage(event, setCompressing, (imageUrl) => {
      updateVariantSlot(slotIndex, (slot) => {
        const imagenes = [...normalizeImageSlots(slot.imagenes)];
        imagenes[imageIndex] = imageUrl;
        return { ...slot, imagenes };
      });
    });

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
    const saveEvent = editingId ? "product_updated" : "product_created";
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
    void invalidateAICache(saveEvent);
  };

  const openStockEntry = (product: AdminProduct) => {
    setStockModalProduct(product);
    setShowStockModal(true);
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setStockModalProduct(null);
  };

  const handleStockEntry = async (
    tallaStock: Record<string, number>,
    costoUnitario: number | undefined,
    proveedor: string,
    observaciones: string,
  ) => {
    if (!stockModalProduct) return;
    try {
      await registrarIngresoStock(
        stockModalProduct.id,
        stockModalProduct.nombre,
        tallaStock,
        costoUnitario,
        proveedor || undefined,
        observaciones || undefined,
      );
      toast.success("Ingreso registrado");
      void invalidateAICache("stock_entry");
      closeStockModal();
      load();
    } catch {
      toast.error("Error al registrar el ingreso de stock");
    }
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
      void invalidateAICache("product_deleted");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  };
  return {
    activeColorSlot,
    activeColorSlotRef,
    categoryFilter,
    clearFilters,
    closeStockModal,
    handleStockEntry,
    openStockEntry,
    showStockModal,
    stockModalProduct,
    clearImage,
    closeModal,
    colorPaletteOpen,
    colorPaletteRef,
    compressing,
    currentFootwearTypes,
    currentImages,
    currentSizes,
    currentStock,
    editingId,
    estiloChipTokens,
    estiloSelectOpen,
    estiloSelectRef,
    estiloSummaryLabel,
    featuredFilter,
    fileInputRefs,
    filteredProducts,
    form,
    formPriceRange,
    handleDelete,
    handleFileChange,
    handleSave,
    handleVariantFileChange,
    handleVariantsMouseDown,
    handleVariantsMouseMove,
    hasActiveFilters,
    isDraggingVariants,
    isMultiColorCreate,
    loading,
    modalRef,
    openCreate,
    openEdit,
    openVariant,
    popoverAbove,
    previewImage,
    products,
    saving,
    searchTerm,
    setActiveColorSlot,
    setCategoryFilter,
    setColorPaletteOpen,
    setEstiloSelectOpen,
    setFeaturedFilter,
    setForm,
    setPopoverAbove,
    setPreviewImage,
    setSearchTerm,
    setStockFilter,
    setFileInputRef,
    setSlotColor,
    showModal,
    stats,
    stockFilter,
    stopVariantsDrag,
    toggleEstiloOption,
    trapFocus,
    updateCategory,
    updateImageUrl,
    updateTallaStock,
    updateVariantSlot,
    updateVariantSlotImageUrl,
    updateVariantSlotStock,
    validateImageUrl,
    validateVariantSlotImageUrl,
    variantSlots,
    variantTotalStock,
    variantsCarouselRef,
  };
}

export type AdminProductsViewModel = ReturnType<typeof useAdminProductsPage>;

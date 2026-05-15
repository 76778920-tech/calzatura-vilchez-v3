import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { fetchProductCodes, fetchProducts } from "@/domains/productos/services/products";
import { fetchDailySales, fetchProductFinancials, returnDailySaleAtomic } from "@/domains/ventas/services/finance";
import { isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import type { DailySale, SaleCustomer, SaleDocumentType } from "@/types";
import { getProductColors } from "@/utils/colors";
import { openSaleDocumentWindow, renderSaleDocument } from "@/utils/saleDocument";
import { getAvailableSizes, getSizeStock } from "@/utils/stock";
import type { PendingSaleLine, SaleProduct } from "./adminSalesTypes";
import {
  EMPTY_SALE_CUSTOMER,
  executeRegisterPendingSales,
  messageForInvalidAddSaleLine,
  newLineId,
  saleLineProfit,
  saleLineTotal,
  showDniLookupError,
  toastFromSalesError,
  todayISO,
} from "./adminSalesRegisterLogic";
import { computeAdminSalesTotals } from "./adminSalesTotals";

export type AdminSalesTotalsShape = {
  cantidad: number;
  total: number;
  ganancia: number;
  pending: { cantidad: number; total: number; ganancia: number };
};

export type AdminSalesPageModel = {
  loading: boolean;
  products: SaleProduct[];
  sales: DailySale[];
  setSales: React.Dispatch<React.SetStateAction<DailySale[]>>;
  pendingLines: PendingSaleLine[];
  saving: boolean;
  date: string;
  setDate: (v: string) => void;
  productId: string;
  quantity: number;
  salePrice: number;
  brandSearch: string;
  codeSearch: string;
  brandFocused: boolean;
  setBrandFocused: (v: boolean) => void;
  codeFocused: boolean;
  setCodeFocused: (v: boolean) => void;
  selectedColor: string;
  selectedTalla: string;
  documentType: SaleDocumentType;
  customer: SaleCustomer;
  validatedDni: string;
  lookingUpDni: boolean;
  selectedSale: DailySale | null;
  setSelectedSale: (v: DailySale | null) => void;
  returnMotivo: string;
  setReturnMotivo: React.Dispatch<React.SetStateAction<string>>;
  returning: boolean;
  historialSearch: string;
  setHistorialSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedProduct: SaleProduct | undefined;
  availableColors: string[];
  availableSizes: string[];
  brandSuggestions: string[];
  codeSuggestions: SaleProduct[];
  availableForSelected: number;
  totals: AdminSalesTotalsShape;
  requiresCustomer: boolean;
  customerIsValidated: boolean;
  handleBrandSearchChange: (value: string) => void;
  handleCodeSearchChange: (value: string) => void;
  selectBrand: (brand: string) => void;
  selectProduct: (product: SaleProduct) => void;
  handleColorChange: (color: string) => void;
  setSelectedTalla: (v: string) => void;
  setQuantity: (v: number) => void;
  setSalePrice: (v: number) => void;
  availableForSize: (size: string) => number;
  handleDocumentTypeChange: (type: SaleDocumentType) => void;
  handleCustomerDniChange: (value: string) => void;
  validateCustomerDni: () => Promise<SaleCustomer | null>;
  addLine: () => void;
  removeLine: (lineId: string) => void;
  registerPendingLines: () => void;
  handleViewDocument: (sale: DailySale) => void;
  handleReturn: () => Promise<void>;
};

export function useAdminSalesPage(): AdminSalesPageModel {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [sales, setSales] = useState<DailySale[]>([]);
  const [pendingLines, setPendingLines] = useState<PendingSaleLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState(0);
  const [brandSearch, setBrandSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [brandFocused, setBrandFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedTalla, setSelectedTalla] = useState("");
  const [documentType, setDocumentType] = useState<SaleDocumentType>("ninguno");
  const [customer, setCustomer] = useState<SaleCustomer>(EMPTY_SALE_CUSTOMER);
  const [validatedDni, setValidatedDni] = useState("");
  const [lookingUpDni, setLookingUpDni] = useState(false);
  const [selectedSale, setSelectedSale] = useState<DailySale | null>(null);
  const [returnMotivo, setReturnMotivo] = useState("");
  const [returning, setReturning] = useState(false);
  const [historialSearch, setHistorialSearch] = useState("");

  const load = useCallback((targetDate = date) => {
    setLoading(true);
    return Promise.allSettled([fetchProducts(), fetchProductCodes(), fetchProductFinancials(), fetchDailySales(targetDate)])
      .then(([itemsResult, codesResult, financialsResult, daySalesResult]) => {
        if (itemsResult.status === "rejected") throw itemsResult.reason;
        const items = itemsResult.value;
        const codes = codesResult.status === "fulfilled" ? codesResult.value : {};
        const financials = financialsResult.status === "fulfilled" ? financialsResult.value : {};
        const daySales = daySalesResult.status === "fulfilled" ? daySalesResult.value : [];

        if (codesResult.status === "rejected") {
          toast.error("No se pudieron cargar los códigos de producto");
        }
        if (financialsResult.status === "rejected") {
          toast.error("No se pudo cargar el rango de venta");
        }
        if (daySalesResult.status === "rejected") {
          toast.error(toastFromSalesError(daySalesResult.reason));
        }

        const merged = items.map((item) => ({
          ...item,
          codigo: codes[item.id] ?? "",
          finanzas: financials[item.id],
        }));
        setProducts(merged);
        setSales(daySales);
      })
      .catch((err: unknown) => {
        toast.error(toastFromSalesError(err));
        setProducts([]);
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(date);
  }, [date, load]);

  const selectedProduct = products.find((p) => p.id === productId);
  const availableColors = selectedProduct ? getProductColors(selectedProduct) : [];
  const availableSizes = selectedProduct ? getAvailableSizes(selectedProduct) : [];
  const brandSuggestions = useMemo(() => {
    const term = brandSearch.trim().toLowerCase();
    const unique = new Map<string, string>();
    products.forEach((product) => {
      const brand = product.marca?.trim();
      if (!brand) return;
      if (!term || brand.toLowerCase().includes(term)) {
        unique.set(brand.toLowerCase(), brand);
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b)).slice(0, 8);
  }, [brandSearch, products]);
  const codeSuggestions = useMemo(() => {
    const brandTerm = brandSearch.trim().toLowerCase();
    const codeTerm = codeSearch.trim().toLowerCase();
    return products
      .filter((product) => !brandTerm || product.marca?.toLowerCase().includes(brandTerm))
      .filter((product) =>
        !codeTerm ||
        [product.codigo, product.nombre, product.marca, product.color]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(codeTerm)
      )
      .sort((a, b) => (a.codigo || a.nombre).localeCompare(b.codigo || b.nombre))
      .slice(0, 10);
  }, [brandSearch, codeSearch, products]);

  const selectedSizeStock = selectedProduct && selectedTalla
    ? getSizeStock(selectedProduct, selectedTalla)
    : 0;
  const requiresCustomer = documentType !== "ninguno";
  const customerDni = normalizeDni(customer.dni);
  const customerIsValidated = validatedDni === customerDni && Boolean(customer.nombres && customer.apellidos);
  const reservedForSelected = pendingLines
    .filter((line) => line.productId === productId && line.color === selectedColor && line.talla === selectedTalla)
    .reduce((sum, line) => sum + line.quantity, 0);
  const availableForSelected = Math.max(0, selectedSizeStock - reservedForSelected);

  const totals = useMemo(
    () =>
      computeAdminSalesTotals(sales, pendingLines, products, date, saleLineTotal, saleLineProfit),
    [sales, pendingLines, products, date],
  );

  const resetProductSelection = () => {
    setProductId("");
    setSelectedColor("");
    setSelectedTalla("");
    setQuantity(1);
    setSalePrice(0);
  };

  const productLabel = (product: SaleProduct) => `${product.codigo || "SIN-CODIGO"} - ${product.nombre}`;

  const selectBrand = (brand: string) => {
    setBrandSearch(brand);
    setCodeSearch("");
    resetProductSelection();
    setBrandFocused(false);
    setCodeFocused(true);
  };

  const handleBrandSearchChange = (value: string) => {
    setBrandSearch(value);
    setCodeSearch("");
    resetProductSelection();
  };

  const handleCodeSearchChange = (value: string) => {
    setCodeSearch(value);
    resetProductSelection();
  };

  const selectProduct = (product: SaleProduct) => {
    setProductId(product.id);
    setBrandSearch(product.marca ?? "");
    setCodeSearch(productLabel(product));
    setSelectedColor(product.color ?? "");
    setSelectedTalla("");
    setQuantity(1);
    setSalePrice(product.finanzas?.precioSugerido ?? product.precio);
    setCodeFocused(false);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setSelectedTalla("");
  };

  const availableForSize = (size: string) => {
    if (!selectedProduct) return 0;
    const stock = getSizeStock(selectedProduct, size);
    const reserved = pendingLines
      .filter((line) => line.productId === productId && line.color === selectedColor && line.talla === size)
      .reduce((sum, line) => sum + line.quantity, 0);
    return Math.max(0, stock - reserved);
  };

  const handleDocumentTypeChange = (type: SaleDocumentType) => {
    setDocumentType(type);
    if (type === "ninguno") {
      setCustomer(EMPTY_SALE_CUSTOMER);
      setValidatedDni("");
    }
  };

  const handleCustomerDniChange = (value: string) => {
    const dni = normalizeDni(value);
    setCustomer((current) => ({
      ...current,
      dni,
      nombres: dni === validatedDni ? current.nombres : "",
      apellidos: dni === validatedDni ? current.apellidos : "",
    }));
    if (dni !== validatedDni) {
      setValidatedDni("");
    }
  };

  const validateCustomerDni = async () => {
    const dni = normalizeDni(customer.dni);
    setCustomer((current) => ({ ...current, dni }));

    if (!isValidDni(dni)) {
      toast.error("Ingresa un DNI valido de 8 digitos");
      return null;
    }

    setLookingUpDni(true);
    try {
      const person = await lookupDni(dni);
      const nextCustomer = { dni: person.dni, nombres: person.nombres, apellidos: person.apellidos };
      setCustomer(nextCustomer);
      setValidatedDni(person.dni);
      toast.success("Cliente validado por DNI");
      return nextCustomer;
    } catch (err: unknown) {
      setCustomer((current) => ({ ...current, nombres: "", apellidos: "" }));
      setValidatedDni("");
      showDniLookupError(err);
      return null;
    } finally {
      setLookingUpDni(false);
    }
  };

  const addLine = () => {
    const invalidMsg = messageForInvalidAddSaleLine({
      selectedProduct,
      availableColors,
      selectedColor,
      availableSizes,
      selectedTalla,
      quantity,
      availableForSelected,
      salePrice,
    });
    if (invalidMsg) {
      toast.error(invalidMsg);
      return;
    }
    if (!selectedProduct?.finanzas) {
      toast.error("Este producto no tiene costo ni rango de venta registrado");
      return;
    }

    setPendingLines((items) => [
      ...items,
      {
        id: newLineId(),
        productId: selectedProduct.id,
        color: selectedColor,
        talla: selectedTalla,
        quantity,
        salePrice,
      },
    ]);
    setQuantity(1);
    toast.success("Línea agregada al detalle");
  };

  const removeLine = (lineId: string) => {
    setPendingLines((items) => items.filter((line) => line.id !== lineId));
  };

  const registerPendingLines = () =>
    executeRegisterPendingSales({
      pendingLines,
      products,
      date,
      documentType,
      requiresCustomer,
      customer,
      setSaving,
      setCustomer,
      setValidatedDni,
      setPendingLines,
      setDocumentType,
      load: () => load(date),
    });

  const handleViewDocument = (sale: DailySale) => {
    if (!sale.cliente || !sale.documentoTipo || sale.documentoTipo === "ninguno") return;
    const preview = openSaleDocumentWindow();
    if (!preview) {
      toast.error("Permite ventanas emergentes para ver el documento");
      return;
    }
    renderSaleDocument(preview, {
      id: sale.documentoNumero ?? sale.id.slice(-5).toUpperCase(),
      type: sale.documentoTipo,
      customer: sale.cliente,
      date: new Date(sale.creadoEn),
      lines: [{
        codigo: sale.codigo,
        nombre: sale.nombre,
        color: sale.color,
        talla: sale.talla,
        quantity: sale.cantidad,
        salePrice: sale.precioVenta,
        total: sale.total,
      }],
    });
  };

  const handleReturn = async () => {
    if (!selectedSale) return;
    const motivo = returnMotivo.trim();
    if (!motivo) {
      toast.error("Escribe el motivo de la devolución");
      return;
    }
    setReturning(true);
    try {
      const returned = await returnDailySaleAtomic(selectedSale.id, motivo);
      await load(date);
      setSelectedSale((prev) => prev ? { ...prev, ...returned } : null);
      setReturnMotivo("");
      toast.success("Devolución registrada y stock restaurado");
    } catch (err: unknown) {
      toast.error(toastFromSalesError(err));
    } finally {
      setReturning(false);
    }
  };

  return {
    loading,
    products,
    sales,
    setSales,
    pendingLines,
    saving,
    date,
    setDate,
    productId,
    quantity,
    salePrice,
    brandSearch,
    codeSearch,
    brandFocused,
    setBrandFocused,
    codeFocused,
    setCodeFocused,
    selectedColor,
    selectedTalla,
    documentType,
    customer,
    validatedDni,
    lookingUpDni,
    selectedSale,
    setSelectedSale,
    returnMotivo,
    setReturnMotivo,
    returning,
    historialSearch,
    setHistorialSearch,
    selectedProduct,
    availableColors,
    availableSizes,
    brandSuggestions,
    codeSuggestions,
    availableForSelected,
    totals,
    requiresCustomer,
    customerIsValidated,
    handleBrandSearchChange,
    handleCodeSearchChange,
    selectBrand,
    selectProduct,
    handleColorChange,
    setSelectedTalla,
    setQuantity,
    setSalePrice,
    availableForSize,
    handleDocumentTypeChange,
    handleCustomerDniChange,
    validateCustomerDni,
    addLine,
    removeLine,
    registerPendingLines,
    handleViewDocument,
    handleReturn,
  };
}

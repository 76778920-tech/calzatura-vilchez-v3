import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, CircleDollarSign, Eye, FileText, IdCard, PackageSearch, Plus, RotateCcw, Trash2, TrendingUp, Truck, X } from "lucide-react";
import toast from "react-hot-toast";
import { addDailySale, decrementProductStock, fetchDailySales, fetchProductFinancials, markSaleReturned, restoreProductStock } from "@/domains/ventas/services/finance";
import { fetchProductCodes, fetchProducts } from "@/domains/productos/services/products";
import { isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import type { DailySale, Product, ProductFinancial, SaleCustomer, SaleDocumentType } from "@/types";
import { getProductColors } from "@/utils/colors";
import { closeSaleDocumentWindow, openSaleDocumentWindow, renderSaleDocument, type SaleDocumentLine } from "@/utils/saleDocument";
import { getAvailableSizes, getSizeStock } from "@/utils/stock";

type SaleProduct = Product & { codigo?: string; finanzas?: ProductFinancial };
type PendingSaleLine = {
  id: string;
  productId: string;
  color: string;
  talla: string;
  quantity: number;
  salePrice: number;
};

const EMPTY_SALE_CUSTOMER: SaleCustomer = { dni: "", nombres: "", apellidos: "" };

const SALE_DOCUMENT_LABELS: Record<SaleDocumentType, string> = {
  ninguno: "Sin comprobante",
  nota_venta: "Nota de venta",
  guia_remision: "Guia de remision",
};

function todayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function saleLineTotal(line: PendingSaleLine) {
  return line.salePrice * line.quantity;
}

function saleLineProfit(line: PendingSaleLine, product?: SaleProduct) {
  const cost = product?.finanzas?.costoCompra ?? line.salePrice;
  return (line.salePrice - cost) * line.quantity;
}

function makeDocumentNumber(type: Exclude<SaleDocumentType, "ninguno">, date: string) {
  const prefix = type === "nota_venta" ? "NV" : "GR";
  const stamp = date.replaceAll("-", "");
  const suffix = String(Date.now()).slice(-5).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}


function showDniLookupError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "DNI_LOOKUP_NOT_CONFIGURED") {
    toast.error("La busqueda por DNI aun no tiene API configurada");
  } else if (msg === "DNI_NOT_FOUND") {
    toast.error("No se encontraron datos para este DNI");
  } else {
    toast.error("No se pudo consultar el DNI");
  }
}

function isDniLookupError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  return ["DNI_INVALID", "DNI_LOOKUP_NOT_CONFIGURED", "DNI_NOT_FOUND", "DNI_LOOKUP_FAILED"].includes(msg);
}

function messageForInvalidAddSaleLine(
  selectedProduct: SaleProduct | undefined,
  availableColors: string[],
  selectedColor: string,
  availableSizes: string[],
  selectedTalla: string,
  quantity: number,
  availableForSelected: number,
  salePrice: number
): string | null {
  if (!selectedProduct) return "Selecciona un producto";
  if (!selectedProduct.finanzas) return "Este producto no tiene costo ni rango de venta registrado";
  if (availableColors.length > 0 && !selectedColor) return "Selecciona un color";
  if (availableSizes.length > 0 && !selectedTalla) return "Selecciona una talla";
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "La cantidad debe ser un número entero mayor a cero";
  }
  if (quantity > availableForSelected) return "La cantidad supera el stock disponible para esa talla";
  const fin = selectedProduct.finanzas;
  if (salePrice < fin.precioMinimo || salePrice > fin.precioMaximo) {
    return "El precio debe estar dentro del rango mínimo y máximo";
  }
  return null;
}

async function insertPendingLinesAsDailySales(
  pendingLines: PendingSaleLine[],
  products: SaleProduct[],
  date: string,
  documentType: SaleDocumentType,
  docNumber: string | undefined,
  saleCustomer: SaleCustomer | undefined
): Promise<void> {
  await Promise.all(
    pendingLines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product?.finanzas) throw new Error("Producto sin finanzas");
      const total = saleLineTotal(line);
      const costoTotal = product.finanzas.costoCompra * line.quantity;
      return addDailySale({
        productId: product.id,
        codigo: product.codigo || "SIN-CODIGO",
        nombre: product.nombre,
        color: line.color || product.color || "",
        talla: line.talla || undefined,
        fecha: date,
        cantidad: line.quantity,
        precioVenta: line.salePrice,
        total,
        costoUnitario: product.finanzas.costoCompra,
        costoTotal,
        ganancia: total - costoTotal,
        documentoTipo: documentType,
        ...(docNumber ? { documentoNumero: docNumber } : {}),
        ...(saleCustomer ? { cliente: saleCustomer } : {}),
      });
    })
  );
}

async function decrementStockForPendingLines(pendingLines: PendingSaleLine[]): Promise<void> {
  const linesByProduct = pendingLines.reduce<Record<string, PendingSaleLine[]>>((acc, line) => {
    acc[line.productId] = [...(acc[line.productId] ?? []), line];
    return acc;
  }, {});

  await Promise.all(
    Object.entries(linesByProduct).map(([id, lines]) =>
      decrementProductStock(
        id,
        lines.map((l) => ({ talla: l.talla || null, cantidad: l.quantity }))
      )
    )
  );
}

async function resolveRegisterSaleCustomerForDocument(
  requiresCustomer: boolean,
  customer: SaleCustomer,
  documentPreview: Window | null,
  setCustomer: (c: SaleCustomer) => void,
  setValidatedDni: (d: string) => void
): Promise<SaleCustomer | undefined> {
  if (!requiresCustomer) return undefined;
  const dni = normalizeDni(customer.dni);
  if (!isValidDni(dni)) {
    toast.error("Ingresa el DNI del cliente para emitir el documento");
    closeSaleDocumentWindow(documentPreview);
    return undefined;
  }
  const person = await lookupDni(dni);
  const saleCustomer = { dni: person.dni, nombres: person.nombres, apellidos: person.apellidos };
  setCustomer(saleCustomer);
  setValidatedDni(person.dni);
  return saleCustomer;
}

function renderRegisterSaleDocumentIfNeeded(
  documentToIssue: "nota_venta" | "guia_remision" | null,
  docNumber: string | undefined,
  saleCustomer: SaleCustomer | undefined,
  documentPreview: Window | null,
  pendingLines: PendingSaleLine[],
  products: SaleProduct[]
) {
  if (!documentToIssue || !docNumber || !saleCustomer || !documentPreview) return;
  const documentLines: SaleDocumentLine[] = pendingLines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    return {
      codigo: product?.codigo || "SIN-CODIGO",
      nombre: product?.nombre || "Producto",
      color: line.color || product?.color || "",
      talla: line.talla,
      quantity: line.quantity,
      salePrice: line.salePrice,
      total: saleLineTotal(line),
    };
  });
  const rendered = renderSaleDocument(documentPreview, {
    id: docNumber,
    type: documentToIssue,
    customer: saleCustomer,
    date: new Date(),
    lines: documentLines,
  });
  if (rendered) {
    toast.success("Documento listo para imprimir o guardar como PDF");
  } else {
    toast.error("No se pudo abrir el documento");
  }
}

type RegisterPendingSalesParams = {
  pendingLines: PendingSaleLine[];
  products: SaleProduct[];
  date: string;
  documentType: SaleDocumentType;
  requiresCustomer: boolean;
  customer: SaleCustomer;
  setSaving: (v: boolean) => void;
  setCustomer: (c: SaleCustomer) => void;
  setValidatedDni: (d: string) => void;
  setPendingLines: Dispatch<SetStateAction<PendingSaleLine[]>>;
  setDocumentType: (t: SaleDocumentType) => void;
  load: () => void;
};

async function executeRegisterPendingSales(p: RegisterPendingSalesParams): Promise<void> {
  const {
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
    load,
  } = p;

  if (pendingLines.length === 0) {
    toast.error("Agrega al menos una línea de venta");
    return;
  }

  const documentToIssue = documentType === "nota_venta" || documentType === "guia_remision" ? documentType : null;
  const docNumber = documentToIssue ? makeDocumentNumber(documentToIssue, date) : undefined;
  const documentPreview = documentToIssue ? openSaleDocumentWindow() : null;
  if (documentToIssue && !documentPreview) {
    toast.error("Permite ventanas emergentes para generar el documento");
    return;
  }

  setSaving(true);
  try {
    const saleCustomer = await resolveRegisterSaleCustomerForDocument(
      requiresCustomer,
      customer,
      documentPreview,
      setCustomer,
      setValidatedDni
    );
    if (requiresCustomer && !saleCustomer) return;

    await insertPendingLinesAsDailySales(pendingLines, products, date, documentType, docNumber, saleCustomer);
    await decrementStockForPendingLines(pendingLines);

    toast.success("Ventas registradas");
    renderRegisterSaleDocumentIfNeeded(
      documentToIssue,
      docNumber,
      saleCustomer,
      documentPreview,
      pendingLines,
      products
    );

    setPendingLines([]);
    setDocumentType("ninguno");
    setCustomer(EMPTY_SALE_CUSTOMER);
    setValidatedDni("");
    load();
  } catch (err: unknown) {
    if (isDniLookupError(err)) {
      showDniLookupError(err);
    } else {
      toast.error("No se pudo registrar la venta");
    }
    closeSaleDocumentWindow(documentPreview);
  } finally {
    setSaving(false);
  }
}

export default function AdminSales() {
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

  const loadSales = useCallback((targetDate: string) => {
    fetchDailySales(targetDate).then(setSales).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchProducts(), fetchProductCodes(), fetchProductFinancials(), fetchDailySales(todayISO())])
      .then(([items, codes, financials, daySales]) => {
        const merged = items.map((item) => ({
          ...item,
          codigo: codes[item.id] ?? "",
          finanzas: financials[item.id],
        }));
        setProducts(merged);
        setSales(daySales);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    loadSales(date);
  }, [date, loadSales]);

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

  const totals = useMemo(() => {
    const registered = sales
      .filter((s) => s.fecha === date && !s.devuelto)
      .reduce(
        (acc, sale) => ({
          cantidad: acc.cantidad + sale.cantidad,
          total: acc.total + sale.total,
          ganancia: acc.ganancia + sale.ganancia,
        }),
        { cantidad: 0, total: 0, ganancia: 0 }
      );
    const pending = pendingLines.reduce(
      (acc, line) => {
        const product = products.find((p) => p.id === line.productId);
        return {
          cantidad: acc.cantidad + line.quantity,
          total: acc.total + saleLineTotal(line),
          ganancia: acc.ganancia + saleLineProfit(line, product),
        };
      },
      { cantidad: 0, total: 0, ganancia: 0 }
    );
    return {
      cantidad: registered.cantidad + pending.cantidad,
      total: registered.total + pending.total,
      ganancia: registered.ganancia + pending.ganancia,
      pending,
    };
  }, [sales, pendingLines, products, date]);

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
    const invalidMsg = messageForInvalidAddSaleLine(
      selectedProduct,
      availableColors,
      selectedColor,
      availableSizes,
      selectedTalla,
      quantity,
      availableForSelected,
      salePrice
    );
    if (invalidMsg) {
      toast.error(invalidMsg);
      return;
    }
    if (!selectedProduct?.finanzas) return;

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
      load,
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
      await markSaleReturned(selectedSale.id, motivo);
      await restoreProductStock(selectedSale.productId, selectedSale.talla ?? null, selectedSale.cantidad);
      const now = new Date().toISOString();
      setSales((prev) =>
        prev.map((s) =>
          s.id === selectedSale.id ? { ...s, devuelto: true, motivoDevolucion: motivo, devueltoEn: now } : s
        )
      );
      setSelectedSale((prev) => prev ? { ...prev, devuelto: true, motivoDevolucion: motivo, devueltoEn: now } : null);
      setReturnMotivo("");
      toast.success("Devolución registrada y stock restaurado");
    } catch {
      toast.error("No se pudo registrar la devolución");
    } finally {
      setReturning(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando ventas...</p>
      </div>
    );
  }

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-kicker">Ventas diarias</span>
          <h1 className="admin-page-title">Consulta y registro de ventas</h1>
          <p className="admin-page-subtitle">
            Agrega una o varias tallas al detalle y registra la venta completa.
          </p>
        </div>
        <div className="admin-date-label-group">
          <span className="admin-date-label">Fecha de métricas y registro</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input admin-date-input" />
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <CircleDollarSign size={22} />
          <div><span>Vendido — {new Date(date + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span><strong>S/ {totals.total.toFixed(2)}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <TrendingUp size={22} />
          <div><span>Ganancia</span><strong>S/ {totals.ganancia.toFixed(2)}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <PackageSearch size={22} />
          <div><span>Unidades</span><strong>{totals.cantidad}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <Calculator size={22} />
          <div><span>Productos</span><strong>{products.length}</strong></div>
        </div>
      </div>

      <div className="admin-sales-grid">
        <div className="admin-sale-panel">
          <div className="admin-sale-section">
            <div className="admin-section-header">
              <div>
                <h2>Buscar producto</h2>
                <span>Primero marca, luego codigo o modelo.</span>
              </div>
            </div>

            <div className="admin-sale-lookup-grid">
              <div className="form-group admin-suggest-field">
                <label>Marca</label>
                <div className="admin-search-wrapper">
                  <PackageSearch size={17} />
                  <input
                    value={brandSearch}
                    onChange={(e) => handleBrandSearchChange(e.target.value)}
                    onFocus={() => setBrandFocused(true)}
                    onBlur={() => window.setTimeout(() => setBrandFocused(false), 120)}
                    placeholder="Escribe la marca"
                  />
                </div>
                {brandFocused && brandSuggestions.length > 0 && (
                  <div className="admin-suggestions-list">
                    {brandSuggestions.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectBrand(brand)}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group admin-suggest-field">
                <label>Codigo o modelo</label>
                <div className="admin-search-wrapper">
                  <PackageSearch size={17} />
                  <input
                    value={codeSearch}
                    onChange={(e) => handleCodeSearchChange(e.target.value)}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => window.setTimeout(() => setCodeFocused(false), 120)}
                    placeholder="Escribe codigo o nombre"
                  />
                </div>
                {codeFocused && codeSuggestions.length > 0 && (
                  <div className="admin-suggestions-list product-suggestions-list">
                    {codeSuggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectProduct(product)}
                      >
                        <span className="admin-code-badge">{product.codigo || "SIN-CODIGO"}</span>
                        <strong>{product.nombre}</strong>
                        <small>{product.marca || "Sin marca"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedProduct ? (
              <div className="admin-selected-product">
                <span className="admin-code-badge">{selectedProduct.codigo || "SIN-CODIGO"}</span>
                <div>
                  <strong>{selectedProduct.nombre}</strong>
                  <small>{selectedProduct.marca || "Sin marca"}</small>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Busca y selecciona un producto para continuar con la venta.</p>
            )}
          </div>

          {selectedProduct && (
            <div className="admin-sale-config-grid">
            <div className="admin-sale-section">
              <div className="admin-section-header">
                <div>
                  <h2>Color y talla</h2>
                  <span>Elige manualmente la variante que se vendera.</span>
                </div>
              </div>

              {availableColors.length > 0 && (
                <div className="form-group">
                  <label>Color</label>
                  <div className="admin-choice-grid">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        className={`admin-choice-btn ${selectedColor === color ? "active" : ""}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableColors.length > 0 && !selectedColor ? (
                <p className="admin-empty">Selecciona un color para ver sus tallas disponibles.</p>
              ) : availableSizes.length > 0 ? (
                <div className="form-group">
                  <label>Talla</label>
                  <div className="admin-size-picker">
                    {availableSizes.map((size) => {
                      const stock = availableForSize(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={stock <= 0}
                          onClick={() => setSelectedTalla(size)}
                          className={`admin-size-choice ${selectedTalla === size ? "active" : ""}`}
                        >
                          <strong>{size}</strong>
                          <span>{stock} disp.</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="admin-empty">No hay tallas disponibles para esta seleccion.</p>
              )}
            </div>

            <div className="admin-sale-section">
              <div className="admin-section-header">
                <div>
                  <h2>Precio y cantidad</h2>
                  <span>Confirma el precio dentro del rango permitido.</span>
                </div>
              </div>

              {selectedProduct.finanzas ? (
                <div className="admin-price-consult">
                  <span>Minimo: S/ {selectedProduct.finanzas.precioMinimo.toFixed(2)}</span>
                  <strong>Sugerido: S/ {selectedProduct.finanzas.precioSugerido.toFixed(2)}</strong>
                  <span>Maximo: S/ {selectedProduct.finanzas.precioMaximo.toFixed(2)}</span>
                </div>
              ) : (
                <p className="admin-empty">Este producto necesita costo real y margenes en Productos.</p>
              )}

          <div className="form-row">
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                max={availableForSelected || 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Precio de venta</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="admin-sale-summary">
            <span>Stock disponible: {availableForSelected}</span>
            <strong>Total linea: S/ {(salePrice * quantity).toFixed(2)}</strong>
          </div>

              <button type="button" onClick={addLine} className="btn-outline admin-sale-add-line">
                <Plus size={16} /> Agregar al detalle
              </button>
            </div>
            </div>
          )}

          <div className="admin-pending-sale">
            <div className="admin-section-header">
              <h2>Detalle por registrar</h2>
              <strong>S/ {totals.pending.total.toFixed(2)}</strong>
            </div>
            {pendingLines.length === 0 ? (
              <p className="admin-empty">Aun no agregaste productos a esta venta.</p>
            ) : (
              <div className="admin-pending-lines">
                {pendingLines.map((line) => {
                  const product = products.find((p) => p.id === line.productId);
                  return (
                    <div key={line.id} className="admin-pending-line">
                      <div>
                        <strong>{product?.nombre}</strong>
                        <span>
                          {line.color || "Sin color"} - Talla {line.talla || "-"} - x{line.quantity}
                        </span>
                      </div>
                      <strong>S/ {saleLineTotal(line).toFixed(2)}</strong>
                      <button type="button" onClick={() => removeLine(line.id)} className="action-btn delete-btn" aria-label="Quitar línea">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-sale-document-box">
            <div className="admin-section-header">
              <div>
                <h2>Documento del cliente</h2>
                <span>Selecciona nota o guia solo si el cliente la solicita.</span>
              </div>
            </div>

            <div className="admin-document-options" role="radiogroup" aria-label="Documento de venta">
              <button
                type="button"
                onClick={() => handleDocumentTypeChange("ninguno")}
                className={`admin-document-option ${documentType === "ninguno" ? "active" : ""}`}
              >
                <FileText size={16} />
                <span>Venta simple</span>
              </button>
              <button
                type="button"
                onClick={() => handleDocumentTypeChange("nota_venta")}
                className={`admin-document-option ${documentType === "nota_venta" ? "active" : ""}`}
              >
                <FileText size={16} />
                <span>Nota de venta</span>
              </button>
              <button
                type="button"
                onClick={() => handleDocumentTypeChange("guia_remision")}
                className={`admin-document-option ${documentType === "guia_remision" ? "active" : ""}`}
              >
                <Truck size={16} />
                <span>Guia de remision</span>
              </button>
            </div>

            {requiresCustomer && (
              <div className="admin-sale-customer-box">
                <div className="admin-sale-dni-row">
                  <div className="form-group">
                    <label>DNI del cliente</label>
                    <input
                      value={customer.dni}
                      onChange={(e) => handleCustomerDniChange(e.target.value)}
                      maxLength={8}
                      inputMode="numeric"
                      className="form-input"
                      placeholder="12345678"
                    />
                  </div>
                  <button type="button" onClick={validateCustomerDni} disabled={lookingUpDni} className="btn-outline admin-sale-dni-btn">
                    <IdCard size={16} /> {lookingUpDni ? "Validando..." : "Validar DNI"}
                  </button>
                </div>

                <div className="admin-sale-customer-grid">
                  <div className="form-group">
                    <label>Nombres</label>
                    <input value={customer.nombres} readOnly className="form-input" placeholder="Se completa al validar" />
                  </div>
                  <div className="form-group">
                    <label>Apellidos</label>
                    <input value={customer.apellidos} readOnly className="form-input" placeholder="Se completa al validar" />
                  </div>
                </div>

                {customerIsValidated && <span className="admin-sale-validated">Cliente validado por DNI</span>}
              </div>
            )}
          </div>

          <button type="button" onClick={registerPendingLines} disabled={saving || pendingLines.length === 0} className="btn-primary">
            <Plus size={16} /> {saving ? "Registrando..." : "Registrar venta completa"}
          </button>
        </div>

        <div className="admin-table-wrapper product-table-wrapper">
          <div className="admin-section-header" style={{ padding: "0.5rem 0 0.25rem" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 700 }}>Historial de ventas</h2>
            <span style={{ fontSize: "12px" }}>Haz clic en una venta para ver el detalle o registrar una devolución</span>
          </div>
          <div className="admin-search-wrapper" style={{ marginBottom: "0.75rem" }}>
            <PackageSearch size={15} />
            <input
              value={historialSearch}
              onChange={(e) => setHistorialSearch(e.target.value)}
              placeholder="Buscar por código, producto, color, talla, DNI..."
              style={{ fontSize: "13px" }}
            />
            {historialSearch && (
              <button
                type="button"
                onClick={() => setHistorialSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", color: "var(--text-muted)" }}
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {(() => {
            const term = historialSearch.trim().toLowerCase();
            const filtered = sales.filter((s) => {
              if (!term) return true;
              return [
                s.codigo, s.nombre, s.color, s.talla,
                s.cliente?.dni, s.cliente?.nombres, s.cliente?.apellidos,
                s.documentoNumero,
              ].some((v) => v?.toLowerCase().includes(term));
            });
            return (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Color</th>
                    <th>Talla</th>
                    <th>Cant.</th>
                    <th>Hora</th>
                    <th>Total</th>
                    <th>Ganancia</th>
                    <th>Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="admin-empty-cell">
                      {sales.length === 0 ? "No hay ventas para esta fecha." : "Sin resultados para esa búsqueda."}
                    </td></tr>
                  )}
                  {filtered.map((sale) => (
                    <tr
                      key={sale.id}
                      className={`sale-row-clickable${sale.devuelto ? " sale-row-devuelto" : ""}`}
                      onClick={() => { setSelectedSale(sale); setReturnMotivo(""); }}
                    >
                      <td><span className="admin-code-badge">{sale.codigo}</span></td>
                      <td>{sale.nombre}</td>
                      <td>{sale.color || "-"}</td>
                      <td>{sale.talla || "-"}</td>
                      <td>{sale.cantidad}</td>
                      <td>{new Date(sale.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>S/ {sale.total.toFixed(2)}</td>
                      <td><strong>S/ {sale.ganancia.toFixed(2)}</strong></td>
                      <td>
                        <div className="admin-sale-document-cell">
                          <strong>{SALE_DOCUMENT_LABELS[sale.documentoTipo ?? "ninguno"]}</strong>
                          {sale.devuelto
                            ? <span className="sale-devuelto-badge">Devuelto</span>
                            : sale.cliente
                              ? <span>{sale.cliente.dni} - {sale.cliente.nombres}</span>
                              : <span>Venta simple</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {selectedSale && (
        <div className="sale-modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="sale-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sale-modal-header">
              <div>
                <h2>Detalle de venta</h2>
                {selectedSale.devuelto && <span className="sale-devuelto-badge">Devuelto</span>}
              </div>
              <button type="button" className="sale-modal-close" onClick={() => setSelectedSale(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="sale-modal-body">
              <div className="sale-modal-product">
                <span className="admin-code-badge">{selectedSale.codigo}</span>
                <div>
                  <strong>{selectedSale.nombre}</strong>
                  {(selectedSale.color || selectedSale.talla) && (
                    <span>
                      {[selectedSale.color && `Color: ${selectedSale.color}`, selectedSale.talla && `Talla: ${selectedSale.talla}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="sale-modal-grid">
                <div className="sale-modal-info">
                  <label>Fecha y hora</label>
                  <span>{new Date(selectedSale.creadoEn).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</span>
                </div>
                <div className="sale-modal-info">
                  <label>Comprobante</label>
                  <span>{SALE_DOCUMENT_LABELS[selectedSale.documentoTipo ?? "ninguno"]}</span>
                </div>
              </div>

              <div className="sale-modal-amounts">
                <div><span>Cantidad</span><strong>{selectedSale.cantidad} ud.</strong></div>
                <div><span>Precio unitario</span><strong>S/ {selectedSale.precioVenta.toFixed(2)}</strong></div>
                <div><span>Total vendido</span><strong>S/ {selectedSale.total.toFixed(2)}</strong></div>
                <div><span>Ganancia</span><strong>S/ {selectedSale.ganancia.toFixed(2)}</strong></div>
              </div>

              {selectedSale.cliente && (
                <div className="sale-modal-customer">
                  <label>Cliente</label>
                  <strong>{selectedSale.cliente.nombres} {selectedSale.cliente.apellidos}</strong>
                  <span>DNI: {selectedSale.cliente.dni}</span>
                </div>
              )}

              {selectedSale.devuelto && (
                <div className="sale-modal-return-info">
                  <strong>Devolución registrada</strong>
                  {selectedSale.devueltoEn && (
                    <span>{new Date(selectedSale.devueltoEn).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</span>
                  )}
                  <p>Motivo: {selectedSale.motivoDevolucion}</p>
                </div>
              )}

              {selectedSale.documentoTipo && selectedSale.documentoTipo !== "ninguno" && selectedSale.cliente && (
                <button type="button" className="btn-outline sale-modal-doc-btn" onClick={() => handleViewDocument(selectedSale)}>
                  <Eye size={15} /> Ver comprobante (PDF)
                </button>
              )}

              {!selectedSale.devuelto && (
                <div className="sale-modal-return">
                  <h3><RotateCcw size={14} /> Devolución o corrección</h3>
                  <p>Indica el motivo. El stock será restaurado automáticamente.</p>
                  <textarea
                    value={returnMotivo}
                    onChange={(e) => setReturnMotivo(e.target.value)}
                    placeholder="Ej: Talla equivocada, venta duplicada, cliente desistió..."
                    rows={3}
                    className="form-input"
                  />
                  <button type="button" onClick={handleReturn} disabled={returning} className="btn-danger sale-modal-return-btn">
                    {returning ? "Procesando..." : "Confirmar devolución"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";
import { addDailySale, decrementProductStock } from "@/domains/ventas/services/finance";
import { isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import type { SaleCustomer, SaleDocumentType } from "@/types";
import { closeSaleDocumentWindow, openSaleDocumentWindow, renderSaleDocument, type SaleDocumentLine } from "@/utils/saleDocument";
import type { PendingSaleLine, SaleProduct } from "./adminSalesTypes";

export const EMPTY_SALE_CUSTOMER: SaleCustomer = { dni: "", nombres: "", apellidos: "" };

export function todayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function newLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saleLineTotal(line: PendingSaleLine) {
  return line.salePrice * line.quantity;
}

export function saleLineProfit(line: PendingSaleLine, product?: SaleProduct) {
  const cost = product?.finanzas?.costoCompra ?? line.salePrice;
  return (line.salePrice - cost) * line.quantity;
}

function makeDocumentNumber(type: Exclude<SaleDocumentType, "ninguno">, date: string) {
  const prefix = type === "nota_venta" ? "NV" : "GR";
  const stamp = date.replaceAll("-", "");
  const suffix = String(Date.now()).slice(-5).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

export function showDniLookupError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "DNI_LOOKUP_NOT_CONFIGURED") {
    toast.error("La busqueda por DNI aun no tiene API configurada");
  } else if (msg === "DNI_NOT_FOUND") {
    toast.error("No se encontraron datos para este DNI");
  } else {
    toast.error("No se pudo consultar el DNI");
  }
}

export function isDniLookupError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  return ["DNI_INVALID", "DNI_LOOKUP_NOT_CONFIGURED", "DNI_NOT_FOUND", "DNI_LOOKUP_FAILED"].includes(msg);
}

type AddSaleLineValidation = {
  selectedProduct: SaleProduct | undefined;
  availableColors: string[];
  selectedColor: string;
  availableSizes: string[];
  selectedTalla: string;
  quantity: number;
  availableForSelected: number;
  salePrice: number;
};

export function messageForInvalidAddSaleLine({
  selectedProduct,
  availableColors,
  selectedColor,
  availableSizes,
  selectedTalla,
  quantity,
  availableForSelected,
  salePrice,
}: AddSaleLineValidation): string | null {
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

export type RegisterPendingSalesParams = {
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

export async function executeRegisterPendingSales(p: RegisterPendingSalesParams): Promise<void> {
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

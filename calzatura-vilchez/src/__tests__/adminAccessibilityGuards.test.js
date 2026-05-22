import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const productsHookSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/productos/pages/useAdminProductsPage.tsx"),
  "utf8",
);
const productDeleteDialogSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/productos/pages/adminProductsView/AdminProductDeleteDialog.tsx"),
  "utf8",
);
const stockEntryModalSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/productos/pages/adminProductsView/AdminProductStockEntryModal.tsx"),
  "utf8",
);
const salesTableSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/ventas/pages/AdminSalesHistorialTable.tsx"),
  "utf8",
);
const saleDetailModalSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/ventas/pages/AdminSaleDetailModal.tsx"),
  "utf8",
);
const manufacturersSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/fabricantes/pages/AdminManufacturers.tsx"),
  "utf8",
);
const adminDataSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/administradores/pages/AdminData.tsx"),
  "utf8",
);
const adminOrdersSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/pedidos/pages/AdminOrders.tsx"),
  "utf8",
);
const adminSalesLoadedSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/ventas/pages/AdminSalesLoadedView.tsx"),
  "utf8",
);
const cartSidebarSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/carrito/components/CartSidebar.tsx"),
  "utf8",
);
const checkoutPageSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/carrito/pages/CheckoutPage.tsx"),
  "utf8",
);
const isoComplianceSource = fs.readFileSync(
  path.resolve(process.cwd(), "docs/ISO-CUMPLIMIENTO-INTERNO.md"),
  "utf8",
);
const accessibleConfirmDialogSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/common/AccessibleConfirmDialog.tsx"),
  "utf8",
);

describe("Admin ventas/productos accessibility guards", () => {
  it("no usa confirm nativo para eliminar productos", () => {
    expect(productsHookSource).not.toContain("confirm(");
    expect(productsHookSource).toContain("setDeleteCandidate(product)");
    expect(productDeleteDialogSource).toContain("aria-modal=\"true\"");
    expect(productDeleteDialogSource).toContain("aria-describedby=\"product-delete-description\"");
    expect(productDeleteDialogSource).toContain("onKeyDown={trapFocus}");
  });

  it("el modal de ingreso de stock gestiona foco, Escape y Tab", () => {
    expect(stockEntryModalSource).toContain("ref={modalRef}");
    expect(stockEntryModalSource).toContain("aria-modal=\"true\"");
    expect(stockEntryModalSource).toContain("event.key === \"Escape\"");
    expect(stockEntryModalSource).toContain("event.key !== \"Tab\"");
    expect(stockEntryModalSource).toContain("first?.focus()");
  });

  it("historial de ventas usa boton accesible y modal dialog, no tr onClick", () => {
    expect(salesTableSource).not.toContain("onClick={() => {\n                onSelectSale(sale);");
    expect(salesTableSource).toContain("sale-row-detail-button");
    expect(salesTableSource).toContain("aria-label={`Ver detalle de venta ${sale.codigo}`}");
    expect(saleDetailModalSource).toContain("aria-modal=\"true\"");
    expect(saleDetailModalSource).toContain("aria-labelledby=\"sale-detail-title\"");
    expect(saleDetailModalSource).toContain("onKeyDown={trapFocus}");
  });

  it("fabricantes y limpieza de datos no usan confirm nativo", () => {
    expect(manufacturersSource).not.toContain("confirm(");
    expect(adminDataSource).not.toContain("globalThis.confirm");
    expect(adminDataSource).not.toContain("confirm(");
    expect(manufacturersSource).toContain("<AccessibleConfirmDialog");
    expect(adminDataSource).toContain("<AccessibleConfirmDialog");
  });

  it("ventas, pedidos y carrito usan confirmacion accesible o dialog modal", () => {
    expect(adminSalesLoadedSource).toContain("<AccessibleConfirmDialog");
    expect(adminSalesLoadedSource).toContain("Confirmar devolución");
    expect(adminOrdersSource).toContain("<AccessibleConfirmDialog");
    expect(adminOrdersSource).not.toContain("confirm(");
    expect(cartSidebarSource).toContain('role="dialog"');
    expect(cartSidebarSource).toContain('aria-modal="true"');
    expect(cartSidebarSource).toContain("event.key === \"Escape\"");
    expect(checkoutPageSource).toContain("<fieldset");
    expect(checkoutPageSource).toContain("<legend");
  });

  it("documenta MFA admin como pendiente en ISO interno", () => {
    expect(isoComplianceSource).toMatch(/MFA.*Pendiente/i);
  });

  it("el dialogo de confirmacion reutilizable gestiona semantica y teclado", () => {
    expect(accessibleConfirmDialogSource).toContain("aria-modal=\"true\"");
    expect(accessibleConfirmDialogSource).toContain("aria-describedby={descriptionId}");
    expect(accessibleConfirmDialogSource).toContain("event.key === \"Escape\"");
    expect(accessibleConfirmDialogSource).toContain("event.key !== \"Tab\"");
    expect(accessibleConfirmDialogSource).toContain("button:not([disabled])");
  });
});

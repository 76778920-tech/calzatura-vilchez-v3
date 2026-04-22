import type { SaleCustomer, SaleDocumentType } from "@/types";

const BUSINESS = {
  name: "Calzatura Vilchez",
  subtitle: "Calzado Premium",
  address: "Mercado Modelo, int. N. 732, Huancayo, Junin, Peru",
  phone: "+51 964 052 530",
};

export type SaleDocumentLine = {
  codigo: string;
  nombre: string;
  color?: string;
  talla?: string;
  quantity: number;
  salePrice: number;
  total: number;
};

export type SaleDocumentInput = {
  id: string;
  type: Exclude<SaleDocumentType, "ninguno">;
  customer: SaleCustomer;
  date: Date;
  lines: SaleDocumentLine[];
};

function money(value = 0) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function documentTitle(type: SaleDocumentInput["type"]) {
  return type === "nota_venta" ? "NOTA DE VENTA" : "GUIA DE REMISION";
}

function documentNote(type: SaleDocumentInput["type"]) {
  return type === "nota_venta"
    ? "Documento interno para entregar al cliente por la venta realizada."
    : "Documento interno para acompanar la entrega o traslado del producto.";
}

function loadingHtml() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Generando documento</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f1eb; color: #171717; font-family: Arial, sans-serif; }
    div { text-align: center; }
    strong { display: block; margin-bottom: 8px; font-size: 20px; }
  </style>
</head>
<body>
  <div>
    <strong>Generando documento...</strong>
    <span>Espera un momento mientras se registra la venta.</span>
  </div>
</body>
</html>`;
}

export function openSaleDocumentWindow() {
  const preview = window.open("", "_blank", "width=900,height=760");
  if (!preview) return null;
  preview.document.open();
  preview.document.write(loadingHtml());
  preview.document.close();
  return preview;
}

export function closeSaleDocumentWindow(preview: Window | null) {
  if (!preview || preview.closed) return;
  preview.close();
}

export function buildSaleDocumentHtml(input: SaleDocumentInput) {
  const title = documentTitle(input.type);
  const customerName = `${input.customer.nombres} ${input.customer.apellidos}`.trim();
  const subtotal = input.lines.reduce((sum, line) => sum + line.total, 0);
  const rows = input.lines
    .map(
      (line) => `
        <tr>
          <td><span class="code">${escapeHtml(line.codigo)}</span></td>
          <td>
            <strong>${escapeHtml(line.nombre)}</strong>
            ${line.color ? `<span>Color: ${escapeHtml(line.color)}</span>` : ""}
            ${line.talla ? `<span>Talla: ${escapeHtml(line.talla)}</span>` : ""}
          </td>
          <td>${escapeHtml(line.quantity)}</td>
          <td>${money(line.salePrice)}</td>
          <td>${money(line.total)}</td>
        </tr>
      `
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(input.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 30px; background: #f4f1eb; color: #171717; font-family: Arial, sans-serif; }
    .document { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #ddd4bf; padding: 32px; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #c9a227; padding-bottom: 20px; }
    .brand h1 { margin: 0; font-family: Georgia, serif; font-size: 26px; }
    .brand p, .box p, .section p, .footer p { margin: 4px 0; color: #555; font-size: 13px; }
    .box { min-width: 220px; border: 1px solid #ddd4bf; padding: 14px; text-align: right; }
    .box strong { display: block; font-size: 18px; margin-bottom: 4px; }
    .section { margin-top: 22px; }
    .section h2 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #8b6d10; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .info-card { border: 1px solid #eee7d6; padding: 14px; min-height: 110px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #666; border-bottom: 1px solid #ddd4bf; padding: 10px 8px; }
    td { padding: 12px 8px; border-bottom: 1px solid #eee7d6; vertical-align: top; }
    td span { display: block; color: #666; font-size: 12px; margin-top: 4px; }
    th:nth-child(n+3), td:nth-child(n+3) { text-align: right; }
    .code { display: inline-block; background: #050505; color: #c9a227; padding: 5px 8px; border-radius: 4px; font-weight: 800; }
    .totals { width: 320px; margin-left: auto; margin-top: 18px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee7d6; }
    .total-row.final { font-size: 20px; font-weight: 800; border-bottom: 0; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #ddd4bf; font-size: 12px; color: #888; }
    @media print {
      body { background: #fff; padding: 0; }
      .document { border: 0; }
    }
    @media (max-width: 700px) {
      body { padding: 12px; }
      .document { padding: 18px; }
      .header, .grid { grid-template-columns: 1fr; display: grid; }
      .box { text-align: left; }
      .totals { width: 100%; }
    }
  </style>
</head>
<body>
  <article class="document">
    <header class="header">
      <div class="brand">
        <h1>${escapeHtml(BUSINESS.name)}</h1>
        <p>${escapeHtml(BUSINESS.subtitle)}</p>
        <p>${escapeHtml(BUSINESS.address)}</p>
        <p>WhatsApp: ${escapeHtml(BUSINESS.phone)}</p>
      </div>
      <div class="box">
        <strong>${escapeHtml(title)}</strong>
        <p>N. ${escapeHtml(input.id)}</p>
        <p>${input.date.toLocaleString("es-PE")}</p>
      </div>
    </header>

    <section class="section grid">
      <div class="info-card">
        <h2>Cliente</h2>
        <p><strong>${escapeHtml(customerName)}</strong></p>
        <p>DNI: ${escapeHtml(input.customer.dni)}</p>
      </div>
      <div class="info-card">
        <h2>Documento</h2>
        <p>${escapeHtml(documentNote(input.type))}</p>
      </div>
    </section>

    <section class="section">
      <h2>Detalle</h2>
      <table>
        <thead>
          <tr><th>Codigo</th><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
        <div class="total-row final"><span>Total</span><strong>${money(subtotal)}</strong></div>
      </div>
    </section>

    <footer class="footer">
      <p>Este documento es una constancia interna de venta fisica.</p>
    </footer>
  </article>
  <script>
    window.addEventListener("load", () => {
      window.setTimeout(() => window.print(), 350);
    });
  </script>
</body>
</html>`;
}

export function renderSaleDocument(preview: Window, input: SaleDocumentInput) {
  if (preview.closed) return false;
  preview.document.open();
  preview.document.write(buildSaleDocumentHtml(input));
  preview.document.close();
  preview.focus();
  return true;
}

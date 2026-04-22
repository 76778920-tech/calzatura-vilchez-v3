import type { Order, UserProfile } from "@/types";
import { formatColors, getProductColors } from "./colors";

const BUSINESS = {
  name: "Calzatura Vilchez",
  subtitle: "Calzado Premium",
  address: "Mercado Modelo, int. N.° 732, Huancayo, Junín, Perú",
  phone: "+51 964 052 530",
};

function money(value = 0) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function shortOrderId(orderId: string) {
  return orderId.slice(-8).toUpperCase();
}

function orderDate(order: Order) {
  const raw = order.creadoEn;
  if (typeof raw === "string") return new Date(raw);
  if (raw && "toDate" in raw) return raw.toDate();
  return new Date();
}

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function receiptFileName(order: Order) {
  return `boleta-cv-${shortOrderId(order.id)}.html`;
}

export function buildReceiptHtml(order: Order, userProfile?: UserProfile | null) {
  const date = orderDate(order);
  const customerName = `${order.direccion?.nombre ?? ""} ${order.direccion?.apellido ?? ""}`.trim();
  const customerDni = userProfile?.dni ?? "No registrado";
  const rows = order.items
    .map((item) => {
      const unit = item.product?.precio ?? 0;
      const lineTotal = unit * item.quantity;
      const colors = item.product ? getProductColors(item.product) : [];
      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.product?.nombre)}</strong>
            ${item.product?.marca ? `<span>Marca: ${escapeHtml(item.product.marca)}</span>` : ""}
            ${colors.length > 0 ? `<span>Color: ${escapeHtml(formatColors(colors))}</span>` : ""}
            ${item.talla ? `<span>Talla: ${escapeHtml(item.talla)}</span>` : ""}
          </td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${money(unit)}</td>
          <td>${money(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Boleta ${escapeHtml(shortOrderId(order.id))}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; background: #f4f1eb; color: #171717; font-family: Arial, sans-serif; }
    .receipt { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #ddd4bf; padding: 32px; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #c9a227; padding-bottom: 20px; }
    .brand { display: flex; gap: 14px; align-items: center; }
    .logo-mark { width: 54px; height: 54px; flex: 0 0 auto; }
    .brand h1 { margin: 0; font-size: 24px; font-family: Georgia, serif; }
    .brand p, .meta p, .section p { margin: 4px 0; color: #555; font-size: 13px; }
    .box { border: 1px solid #ddd4bf; padding: 12px 14px; text-align: right; min-width: 210px; }
    .box strong { display: block; font-size: 18px; margin-bottom: 4px; }
    .section { margin-top: 22px; }
    .section h2 { margin: 0 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; color: #8b6d10; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #666; border-bottom: 1px solid #ddd4bf; padding: 10px 8px; }
    td { padding: 12px 8px; border-bottom: 1px solid #eee7d6; vertical-align: top; }
    td span { display: block; color: #666; font-size: 12px; margin-top: 4px; }
    th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
    .totals { width: 320px; margin-left: auto; margin-top: 18px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee7d6; }
    .total-row.final { font-size: 20px; font-weight: 800; border-bottom: 0; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #ddd4bf; color: #666; font-size: 12px; line-height: 1.5; }
    @media print { body { background: #fff; padding: 0; } .receipt { border: 0; } }
  </style>
</head>
<body>
  <article class="receipt">
    <header class="header">
      <div class="brand">
        <svg class="logo-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect width="64" height="64" rx="14" fill="#050505"/>
          <g transform="translate(32 32)">
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(45)"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(90)"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(135)"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(180)"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(225)"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(270)"/>
            <ellipse cx="0" cy="-18" rx="4.2" ry="10" fill="#C9A227" transform="rotate(315)"/>
            <circle r="11" fill="#3D2008"/>
            <circle r="7.5" fill="#2D1505"/>
            <circle cx="-3.5" cy="-2.8" r="1.2" fill="#8A5A14"/>
            <circle cx="3.4" cy="-2" r="1.1" fill="#8A5A14"/>
            <circle cx="-1" cy="3.8" r="1.1" fill="#8A5A14"/>
            <circle cx="4.5" cy="4.2" r="0.9" fill="#8A5A14"/>
          </g>
        </svg>
        <div>
          <h1>${escapeHtml(BUSINESS.name)}</h1>
          <p>${escapeHtml(BUSINESS.subtitle)}</p>
          <p>${escapeHtml(BUSINESS.address)}</p>
          <p>WhatsApp: ${escapeHtml(BUSINESS.phone)}</p>
        </div>
      </div>
      <div class="box">
        <strong>BOLETA DE PEDIDO</strong>
        <p>N.° ${escapeHtml(shortOrderId(order.id))}</p>
        <p>${date.toLocaleString("es-PE")}</p>
      </div>
    </header>

    <section class="section grid">
      <div>
        <h2>Cliente</h2>
        <p><strong>${escapeHtml(customerName)}</strong></p>
        <p>DNI: ${escapeHtml(customerDni)}</p>
        <p>Correo: ${escapeHtml(order.userEmail)}</p>
        <p>Teléfono: ${escapeHtml(order.direccion?.telefono)}</p>
      </div>
      <div>
        <h2>Entrega</h2>
        <p>${escapeHtml(order.direccion?.direccion)}</p>
        <p>${escapeHtml(order.direccion?.distrito)}, ${escapeHtml(order.direccion?.ciudad)}</p>
        ${order.direccion?.referencia ? `<p>Referencia: ${escapeHtml(order.direccion.referencia)}</p>` : ""}
        <p>Método de pago: ${escapeHtml(order.metodoPago === "contraentrega" ? "Pago contra entrega" : "Tarjeta")}</p>
      </div>
    </section>

    <section class="section">
      <h2>Detalle</h2>
      <table>
        <thead>
          <tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div>
        <div class="total-row"><span>Envío</span><strong>${order.envio === 0 ? "Gratis" : money(order.envio)}</strong></div>
        <div class="total-row final"><span>Total</span><strong>${money(order.total)}</strong></div>
      </div>
    </section>

    <footer class="footer">
      <p>Este documento es una constancia interna del pedido realizado en Calzatura Vilchez.</p>
      <p>Para comprobante electrónico SUNAT se requerirá integración fiscal posterior.</p>
    </footer>
  </article>
</body>
</html>`;
}

export function downloadReceipt(order: Order, userProfile?: UserProfile | null) {
  const html = buildReceiptHtml(order, userProfile);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = receiptFileName(order);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

export function openReceiptPreview(order: Order, userProfile?: UserProfile | null) {
  const html = buildReceiptHtml(order, userProfile);
  const preview = window.open("", "_blank", "noopener,noreferrer,width=900,height=760");
  if (!preview) return false;
  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  return true;
}

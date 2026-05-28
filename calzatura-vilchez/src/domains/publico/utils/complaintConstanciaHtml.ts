import { BUSINESS_CONTACT } from "@/config/businessContact";
import {
  COMPLAINT_LAW_FULL,
  COMPLAINT_LEGAL_CONSTANCIA_BULLETS,
} from "@/domains/publico/utils/complaintLegalPlazos";
import {
  formatConstanciaFecha,
  type ComplaintConstanciaSubmission,
} from "@/domains/publico/utils/complaintConstanciaTypes";

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** HTML estático para pruebas o exportación futura. */
export function buildComplaintConstanciaHtml(submission: ComplaintConstanciaSubmission): string {
  const tipoLabel = submission.tipo === "reclamo" ? "Reclamo" : "Queja";
  const tipoUpper = submission.tipo === "reclamo" ? "RECLAMO" : "QUEJA";
  const { fecha, hora } = formatConstanciaFecha(submission.submittedAt);
  const consumidor = escapeHtml(`${submission.nombres} ${submission.apellidos}`.trim());

  const tableRow = (label: string, value: string) =>
    `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;

  return `<article class="complaint-constancia-document">
<header class="complaint-constancia-header">
<p class="complaint-constancia-eyebrow">${escapeHtml(COMPLAINT_LAW_FULL)}</p>
<h1>Constancia de registro</h1>
<p class="complaint-constancia-subtitle">Libro de reclamaciones — formato virtual</p>
</header>
<section class="complaint-constancia-block"><h2>I. Proveedor del bien o servicio</h2>
<table class="complaint-constancia-table"><tbody>
${tableRow("Razón social", BUSINESS_CONTACT.legalName)}
${tableRow("RUC", BUSINESS_CONTACT.rucDisplay)}
${tableRow("Domicilio", BUSINESS_CONTACT.address)}
${tableRow("Teléfono", BUSINESS_CONTACT.phoneDisplay)}
</tbody></table></section>
<section class="complaint-constancia-block"><h2>II. Datos del registro</h2>
<table class="complaint-constancia-table"><tbody>
${tableRow("N.° de registro", submission.codigo)}
${tableRow("Fecha", fecha)}
${tableRow("Hora", hora)}
${tableRow("Tipo de hoja", `${tipoLabel} (${tipoUpper})`)}
${tableRow("Canal", "Formulario virtual — Web")}
</tbody></table></section>
<section class="complaint-constancia-block"><h2>III. Datos del consumidor reclamante</h2>
<table class="complaint-constancia-table"><tbody>
${tableRow("Nombres y apellidos", consumidor)}
${tableRow("Documento de identidad (DNI)", submission.dni)}
${tableRow("Domicilio", submission.domicilio)}
${tableRow("Teléfono", submission.telefono)}
${tableRow("Correo electrónico", submission.email)}
</tbody></table></section>
<section class="complaint-constancia-block"><h2>IV. Bien o servicio contratado</h2>
<table class="complaint-constancia-table"><tbody>
${tableRow("Descripción", submission.bienContratado)}
${submission.monto ? tableRow("Monto reclamado", `S/ ${submission.monto}`) : ""}
${submission.numeroPedido ? tableRow("N.° de pedido (si aplica)", submission.numeroPedido) : ""}
</tbody></table></section>
<section class="complaint-constancia-block"><h2>V. Detalle del ${tipoLabel.toLowerCase()} y pedido del consumidor</h2>
<div class="complaint-constancia-detail-box">${escapeHtml(submission.detalle)}</div></section>
<footer class="complaint-constancia-legal"><h2>VI. Información al consumidor</h2>
<ul>
${COMPLAINT_LEGAL_CONSTANCIA_BULLETS.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
</ul>
<p class="complaint-constancia-footnote">Documento generado electrónicamente por ${escapeHtml(BUSINESS_CONTACT.legalName)} (RUC ${escapeHtml(BUSINESS_CONTACT.rucDisplay)}). Código de verificación: <strong>${escapeHtml(submission.codigo)}</strong>. Fecha de emisión: ${escapeHtml(fecha)} — ${escapeHtml(hora)}.</p>
</footer></article>`;
}

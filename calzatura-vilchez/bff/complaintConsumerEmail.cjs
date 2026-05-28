"use strict";

const { escapePlainText } = require("./complaintNotifyEmail.cjs");
const { sendResendEmail } = require("./complaintEmailResend.cjs");
const {
  isValidEmail,
  normalizeEmailInput,
} = require("./emailValidation.cjs");
const {
  COMPLAINT_LAW_SHORT,
  complaintPlazosConstanciaBullets,
  complaintPlazosResumenCorto,
} = require("./complaintLegalCopy.cjs");

/** Alineado con `src/config/businessContact.ts` (solo datos públicos de exhibición). */
const PROVIDER = Object.freeze({
  legalName: "Calzatura Vilchez",
  rucDisplay: "10-20028187-5",
  phoneDisplay: "+51 964 052 530",
  indecopiUrl: "https://www.indecopi.gob.pe/",
});

const MAX_NOMBRE = 80;
const LIBRO_LEGAL_PATH = "/legal/libro-reclamaciones";

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isConsumerEmailEnabled() {
  return trimStr(process.env.COMPLAINT_CONSUMER_EMAIL_ENABLED).toLowerCase() !== "false";
}

function resolveAppBaseUrl() {
  const base = trimStr(process.env.APP_URL) || "https://calzaturavilchez-ab17f.web.app";
  return base.replace(/\/+$/, "");
}

function libroReclamacionesUrl() {
  return `${resolveAppBaseUrl()}${LIBRO_LEGAL_PATH}`;
}

function safeSubjectCodigo(codigo) {
  const safe = String(codigo).replace(/[^\w-]/g, "").slice(0, 40);
  return safe || "sin-codigo";
}

function formatFechaRegistroPe(iso) {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      timeZone: "America/Lima",
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return String(iso ?? "");
  }
}

function consumerFirstName(nombres) {
  return escapePlainText(trimStr(nombres).split(/\s+/)[0] || "consumidor").slice(0, MAX_NOMBRE);
}

function tipoLabel(tipo) {
  return tipo === "queja" ? "Queja" : "Reclamo";
}

function buildComplaintConsumerEmailSubject(codigo) {
  return `Constancia de registro — Libro de reclamaciones — ${safeSubjectCodigo(codigo)}`;
}

function buildComplaintConsumerEmailText(payload, codigo, submittedAt) {
  const fecha = formatFechaRegistroPe(submittedAt);
  const bullets = complaintPlazosConstanciaBullets();
  const lines = [
    `${PROVIDER.legalName} — Libro de reclamaciones`,
    "",
    `Hola, ${consumerFirstName(payload.nombres)}:`,
    "",
    "Confirmamos el registro de tu hoja en nuestro libro de reclamaciones (canal web).",
    "",
    `Código de referencia: ${escapePlainText(codigo)}`,
    `Tipo de hoja: ${tipoLabel(payload.tipo)}`,
    `Fecha y hora de registro (Perú): ${escapePlainText(fecha)}`,
    `Bien o servicio: ${escapePlainText(payload.bienContratado).slice(0, 200)}`,
    "",
    "Plazos legales:",
    ...bullets.map((b) => `• ${b}`),
    "",
    complaintPlazosResumenCorto(),
    "",
    `Puedes consultar información y canales en: ${libroReclamacionesUrl()}`,
    "",
    "Conserva este código para seguimiento. También puedes imprimir la constancia desde el sitio tras enviar el formulario.",
    "",
    `Proveedor: ${PROVIDER.legalName} (RUC ${PROVIDER.rucDisplay}). Teléfono: ${PROVIDER.phoneDisplay}.`,
    `Indecopi: ${PROVIDER.indecopiUrl}`,
    "",
    `Este mensaje se envía conforme a la ${COMPLAINT_LAW_SHORT}. No respondas a esta dirección automática;`,
    "para consultas usa los canales indicados en el sitio o el buzón de atención al consumidor.",
  ];
  return lines.join("\n");
}

function buildComplaintConsumerEmailHtml(payload, codigo, submittedAt) {
  const fecha = escapeHtml(formatFechaRegistroPe(submittedAt));
  const nombre = escapeHtml(consumerFirstName(payload.nombres));
  const codigoSafe = escapeHtml(codigo);
  const tipo = escapeHtml(tipoLabel(payload.tipo));
  const bien = escapeHtml(escapePlainText(payload.bienContratado).slice(0, 200));
  const libroUrl = escapeHtml(libroReclamacionesUrl());
  const bullets = complaintPlazosConstanciaBullets()
    .map((b) => `<li style="margin-bottom:8px;">${escapeHtml(b)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Constancia de registro — Libro de reclamaciones</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#18181b;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 16px;background:#18181b;color:#fafafa;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;">${escapeHtml(PROVIDER.legalName)}</p>
              <h1 style="margin:0;font-size:20px;font-weight:600;">Constancia de registro</h1>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Libro de reclamaciones — ${escapeHtml(COMPLAINT_LAW_SHORT)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;">Hola, <strong>${nombre}</strong>:</p>
              <p style="margin:0 0 20px;">Confirmamos el registro de tu hoja en nuestro libro de reclamaciones (formulario virtual).</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#52525b;">Código de referencia</p>
                  <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.02em;color:#18181b;">${codigoSafe}</p>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:14px;">
                <tr><td style="padding:6px 0;color:#52525b;width:38%;">Tipo</td><td style="padding:6px 0;"><strong>${tipo}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#52525b;">Fecha (Perú)</td><td style="padding:6px 0;">${fecha}</td></tr>
                <tr><td style="padding:6px 0;color:#52525b;vertical-align:top;">Bien o servicio</td><td style="padding:6px 0;">${bien}</td></tr>
              </table>
              <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;">Información al consumidor</h2>
              <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#3f3f46;">${bullets}</ul>
              <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;">${escapeHtml(complaintPlazosResumenCorto())}</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${libroUrl}" style="display:inline-block;padding:12px 22px;background:#18181b;color:#fafafa;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Ver libro de reclamaciones</a>
              </p>
              <p style="margin:0;font-size:12px;color:#71717a;">Conserva este código para seguimiento. El trámite es gratuito. También puedes acudir a <a href="${escapeHtml(PROVIDER.indecopiUrl)}" style="color:#18181b;">Indecopi</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:11px;color:#71717a;">
              ${escapeHtml(PROVIDER.legalName)} · RUC ${escapeHtml(PROVIDER.rucDisplay)} · ${escapeHtml(PROVIDER.phoneDisplay)}<br />
              Mensaje automático de constancia. Para gestión del caso, utiliza los canales publicados en el sitio.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function resolveConsumerReplyTo() {
  const dedicated = trimStr(process.env.COMPLAINT_REPLY_TO_EMAIL);
  if (dedicated && isValidEmail(dedicated)) return normalizeEmailInput(dedicated);
  return undefined;
}

/**
 * Envía constancia al correo del consumidor. No lanza: el registro en BD ya está hecho.
 */
async function sendComplaintConsumerEmail(payload, codigo, submittedAt, logServerError) {
  if (!isConsumerEmailEnabled()) {
    return { skipped: true, reason: "disabled" };
  }

  const apiKey = trimStr(process.env.RESEND_API_KEY);
  const from = trimStr(process.env.COMPLAINT_EMAIL_FROM);
  const to = normalizeEmailInput(payload.email);

  if (!isValidEmail(to)) {
    return { skipped: true, reason: "invalid_consumer_email" };
  }

  const result = await sendResendEmail({
    apiKey,
    from,
    to: [to],
    subject: buildComplaintConsumerEmailSubject(codigo),
    text: buildComplaintConsumerEmailText(payload, codigo, submittedAt),
    html: buildComplaintConsumerEmailHtml(payload, codigo, submittedAt),
    replyTo: resolveConsumerReplyTo(),
    logServerError,
    logPrefix: "complaintConsumerEmail",
  });

  return result;
}

module.exports = {
  PROVIDER,
  LIBRO_LEGAL_PATH,
  isConsumerEmailEnabled,
  buildComplaintConsumerEmailSubject,
  buildComplaintConsumerEmailText,
  buildComplaintConsumerEmailHtml,
  sendComplaintConsumerEmail,
};

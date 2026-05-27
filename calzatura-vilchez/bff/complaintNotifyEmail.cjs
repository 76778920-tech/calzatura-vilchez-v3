"use strict";

const {
  isValidEmail,
  normalizeEmailInput,
  NOTIFY_EMAIL_MAX_LENGTH,
} = require("./emailValidation.cjs");

const MAX_NOTIFY_RECIPIENTS = 5;
const MAX_TEXT_FIELD = 500;
const MAX_DETALLE = 4000;

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function escapePlainText(value) {
  return String(value ?? "")
    .replace(/[\0\r\n]/g, " ")
    .replace(/</g, "‹")
    .replace(/>/g, "›");
}

function truncate(value, max) {
  const s = escapePlainText(value);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function parseEmailList(raw) {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const unique = [];
  for (const email of parts) {
    if (!isValidEmail(email, NOTIFY_EMAIL_MAX_LENGTH)) continue;
    if (!unique.includes(email)) unique.push(email);
    if (unique.length >= MAX_NOTIFY_RECIPIENTS) break;
  }
  return unique;
}

/** Destinatarios solo desde servidor; nunca se envían al navegador. */
function loadComplaintNotifyRecipients() {
  const dedicated = parseEmailList(process.env.COMPLAINT_NOTIFY_EMAIL);
  if (dedicated.length > 0) return dedicated;

  if (process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN === "true") {
    return parseEmailList(process.env.SUPERADMIN_EMAILS);
  }
  return [];
}

function buildComplaintEmailText(payload, codigo) {
  const tipoLabel = payload.tipo === "queja" ? "Queja" : "Reclamo";
  const lines = [
    "Nueva hoja en el libro de reclamaciones (canal web)",
    "",
    `Código: ${codigo}`,
    `Tipo: ${tipoLabel}`,
    `Fecha (UTC): ${new Date().toISOString()}`,
    "",
    `Consumidor: ${truncate(payload.nombres, 80)} ${truncate(payload.apellidos, 80)}`,
    `DNI: ${truncate(payload.dni, 8)}`,
    `Domicilio: ${truncate(payload.domicilio, MAX_TEXT_FIELD)}`,
    `Teléfono: ${truncate(payload.telefono, 30)}`,
    `Correo: ${truncate(payload.email, 254)}`,
    `Bien contratado: ${truncate(payload.bienContratado, MAX_TEXT_FIELD)}`,
    payload.monto ? `Monto: S/ ${truncate(payload.monto, 20)}` : null,
    payload.numeroPedido ? `N.° pedido: ${truncate(payload.numeroPedido, 80)}` : null,
    "",
    "Detalle y pedido:",
    truncate(payload.detalle, MAX_DETALLE),
    "",
    "Gestiona el caso en el panel: Reclamaciones (admin o staff).",
  ];
  return lines.filter(Boolean).join("\n");
}

function safeSubjectCodigo(codigo) {
  const safe = String(codigo).replace(/[^\w-]/g, "").slice(0, 40);
  return safe || "sin-codigo";
}

/**
 * Envía aviso al buzón interno. No lanza error al caller: el registro en BD ya está hecho.
 * Requiere RESEND_API_KEY y COMPLAINT_EMAIL_FROM (dominio verificado en Resend).
 */
async function sendComplaintNotifyEmail(payload, codigo, logServerError) {
  const apiKey = trimStr(process.env.RESEND_API_KEY);
  const from = trimStr(process.env.COMPLAINT_EMAIL_FROM);
  const recipients = loadComplaintNotifyRecipients();

  if (!recipients.length) {
    return { skipped: true, reason: "no_recipients" };
  }
  if (!apiKey || !from) {
    logServerError(
      "complaintNotifyEmail: falta RESEND_API_KEY o COMPLAINT_EMAIL_FROM; no se envió aviso.",
    );
    return { skipped: true, reason: "missing_provider_config" };
  }

  const consumerEmail = normalizeEmailInput(payload.email);
  const body = {
    from,
    to: recipients,
    subject: `[Libro reclamaciones] ${safeSubjectCodigo(codigo)}`,
    text: buildComplaintEmailText(payload, codigo),
  };
  if (isValidEmail(consumerEmail)) {
    body.reply_to = consumerEmail;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logServerError(`complaintNotifyEmail: Resend HTTP ${res.status}`, errText.slice(0, 200));
      return { ok: false, reason: "provider_error" };
    }
    return { ok: true };
  } catch (err) {
    logServerError("complaintNotifyEmail:", err?.message || err);
    return { ok: false, reason: "network_error" };
  }
}

module.exports = {
  escapePlainText,
  loadComplaintNotifyRecipients,
  buildComplaintEmailText,
  sendComplaintNotifyEmail,
  parseEmailList,
};

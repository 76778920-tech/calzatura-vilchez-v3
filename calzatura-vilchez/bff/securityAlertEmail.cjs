"use strict";

const { parseEmailList, loadComplaintNotifyRecipients } = require("./complaintNotifyEmail.cjs");

const ALERT_THROTTLE_MS = 60 * 60 * 1000;
const alertSentAt = new Map();

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function escapePlainText(value) {
  return String(value ?? "")
    .replace(/[\0\r\n]/g, " ")
    .replace(/</g, "‹")
    .replace(/>/g, "›");
}

/** Buzón para alertas de abuso (hacking, spam, rate limit). Nunca va al navegador. */
function loadSecurityAlertRecipients() {
  if (process.env.SECURITY_ALERT_ENABLED === "false") return [];
  const dedicated = parseEmailList(process.env.SECURITY_ALERT_EMAIL);
  if (dedicated.length > 0) return dedicated;
  return loadComplaintNotifyRecipients();
}

function shouldThrottleAlert(throttleKey) {
  const now = Date.now();
  const last = alertSentAt.get(throttleKey);
  if (last != null && now - last < ALERT_THROTTLE_MS) return true;
  alertSentAt.set(throttleKey, now);
  return false;
}

function buildSecurityAlertText({ event, ipHash, details }) {
  const lines = [
    "Alerta de seguridad — Calzatura Vilchez (BFF)",
    "",
    `Evento: ${escapePlainText(event)}`,
    `Fecha (UTC): ${new Date().toISOString()}`,
    ipHash ? `Referencia IP (hash): ${escapePlainText(ipHash)}` : null,
    "",
    ...(details ?? []).map((line) => escapePlainText(line)),
    "",
    "No se incluyen datos personales del atacante. Revisa logs en Render y el panel de Resend.",
    "Si fue un cliente legítimo, puede ignorar tras verificar.",
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Aviso por correo ante abuso (rate limit, intentos inválidos repetidos).
 * Usa la misma cuenta Resend; no expone secretos al cliente.
 */
async function sendSecurityAlertEmail({ event, ipHash, details }, logServerError) {
  const recipients = loadSecurityAlertRecipients();
  if (!recipients.length) {
    return { skipped: true, reason: "no_recipients" };
  }

  const apiKey = trimStr(process.env.RESEND_API_KEY);
  const from = trimStr(process.env.COMPLAINT_EMAIL_FROM);
  if (!apiKey || !from) {
    return { skipped: true, reason: "missing_provider_config" };
  }

  const throttleKey = `${event}:${ipHash || "unknown"}`;
  if (shouldThrottleAlert(throttleKey)) {
    return { skipped: true, reason: "throttled" };
  }

  const safeEvent = String(event).replace(/[^\w\s-]/g, "").slice(0, 60).trim() || "evento";
  const body = {
    from,
    to: recipients,
    subject: `[Seguridad] ${safeEvent}`,
    text: buildSecurityAlertText({ event, ipHash, details }),
  };

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
      logServerError(`securityAlertEmail: Resend HTTP ${res.status}`, errText.slice(0, 200));
      return { ok: false, reason: "provider_error" };
    }
    return { ok: true };
  } catch (err) {
    logServerError("securityAlertEmail:", err?.message || err);
    return { ok: false, reason: "network_error" };
  }
}

module.exports = {
  loadSecurityAlertRecipients,
  buildSecurityAlertText,
  sendSecurityAlertEmail,
};

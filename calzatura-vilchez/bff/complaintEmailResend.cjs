"use strict";

const RESEND_TIMEOUT_MS = 12_000;

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Envío transaccional vía Resend. No lanza: devuelve { ok, skipped, reason }.
 */
async function sendResendEmail({
  apiKey,
  from,
  to,
  subject,
  text,
  html,
  replyTo,
  logServerError,
  logPrefix = "complaintEmailResend",
}) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) {
    return { skipped: true, reason: "no_recipients" };
  }
  if (!trimStr(apiKey) || !trimStr(from)) {
    logServerError(`${logPrefix}: falta RESEND_API_KEY o remitente; no se envió correo.`);
    return { skipped: true, reason: "missing_provider_config" };
  }
  if (!trimStr(text) && !trimStr(html)) {
    return { skipped: true, reason: "empty_body" };
  }

  const body = {
    from: trimStr(from),
    to: recipients,
    subject: trimStr(subject).slice(0, 200),
  };
  if (trimStr(text)) body.text = text;
  if (trimStr(html)) body.html = html;
  if (trimStr(replyTo)) body.reply_to = trimStr(replyTo);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${trimStr(apiKey)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logServerError(`${logPrefix}: Resend HTTP ${res.status}`, errText.slice(0, 200));
      return { ok: false, reason: "provider_error" };
    }
    return { ok: true };
  } catch (err) {
    logServerError(`${logPrefix}:`, err?.message || err);
    return { ok: false, reason: "network_error" };
  }
}

module.exports = {
  sendResendEmail,
  RESEND_TIMEOUT_MS,
};

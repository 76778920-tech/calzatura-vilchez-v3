"use strict";

const upstash = require("./upstashRest.cjs");
const { getStoreStatus } = require("./securityStore.cjs");
const {
  loadSecurityAlertRecipients,
  resolveSecurityEmailFrom,
} = require("./securityAlertEmail.cjs");

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production"
    || process.env.VERCEL_ENV === "production"
    || process.env.RENDER === "true"
    || Boolean(process.env.RENDER_SERVICE_ID)
    || Boolean(process.env.FLY_APP_NAME)
  );
}

function isAlertsEnabled() {
  return process.env.SECURITY_ALERT_ENABLED !== "false";
}

/**
 * Auditoría de configuración al arranque. No expone secretos.
 * @returns {{ enabled: boolean, ready: boolean, distributed: boolean, issues: string[], warnings: string[] }}
 */
function auditSecurityMonitoringConfig(log = console) {
  const enabled = isAlertsEnabled();
  const issues = [];
  const warnings = [];
  const store = getStoreStatus();

  if (enabled) {
    if (loadSecurityAlertRecipients().length === 0) {
      issues.push("Definir SECURITY_ALERT_EMAIL o COMPLAINT_NOTIFY_EMAIL (máx. 5 direcciones)");
    }
    if (!String(process.env.RESEND_API_KEY || "").trim()) {
      issues.push("RESEND_API_KEY");
    }
    if (!resolveSecurityEmailFrom()) {
      issues.push("SECURITY_EMAIL_FROM o COMPLAINT_EMAIL_FROM");
    }
  }

  if (isProductionRuntime() && enabled && issues.length > 0) {
    log.error(
      "[security-monitoring] Alertas habilitadas pero configuración incompleta:",
      issues.join("; "),
    );
    if (process.env.SECURITY_ALERT_STRICT === "true") {
      throw new Error("SECURITY_ALERT_STRICT: abortando arranque por configuración incompleta");
    }
  }

  if (isProductionRuntime() && enabled && issues.length === 0) {
    log.log("[security-monitoring] Alertas por correo: listas para producción");
  }

  if (isProductionRuntime() && !store.distributed) {
    warnings.push(
      "UPSTASH_REDIS_REST_URL/TOKEN no definidos: rate limits y contadores solo en memoria de cada réplica",
    );
    log.warn(`[security-monitoring] ${warnings[0]}`);
  } else if (store.distributed) {
    log.log("[security-monitoring] Estado distribuido: Upstash Redis activo");
  }

  if (!enabled) {
    log.warn("[security-monitoring] Alertas desactivadas (SECURITY_ALERT_ENABLED=false)");
  }

  return {
    enabled,
    ready: !enabled || issues.length === 0,
    distributed: store.distributed,
    issues,
    warnings,
  };
}

module.exports = {
  isProductionRuntime,
  isAlertsEnabled,
  auditSecurityMonitoringConfig,
};

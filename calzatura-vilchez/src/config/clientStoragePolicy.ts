/**
 * Política de almacenamiento en el navegador (ISO 27001 A.8.11 / A.8.24).
 *
 * - No guardar JWT, contraseñas ni PII persistente en localStorage.
 * - Preferencias de UI y carrito invitado: localStorage (no sensibles).
 * - Datos de flujo breve (p. ej. correo pendiente de verificación): sessionStorage.
 * - Sesión Firebase: IndexedDB vía SDK (no tokens propios en cookies).
 *
 * Cookies propias de autenticación: no usadas; __cf_bm es de Cloudflare (bot management).
 */

export const CLIENT_STORAGE = {
  theme: { key: "calzatura_theme", backend: "localStorage", sensitivity: "none" },
  cartGuest: { key: "calzatura_cart", backend: "localStorage", sensitivity: "none" },
  cartUser: { key: "calzatura_cart:*", backend: "localStorage", sensitivity: "none" },
  adminSidebar: { key: "adminSidebarCollapsed", backend: "localStorage", sensitivity: "none" },
  predPrefs: { key: "pred_*", backend: "localStorage", sensitivity: "none" },
  receiptFlag: { key: "receipt_downloaded_*", backend: "localStorage", sensitivity: "none" },
  chunkRecovery: { key: "cv_chunk_reload_attempted", backend: "sessionStorage", sensitivity: "none" },
  pendingVerifyEmail: {
    key: "calzatura.pendingVerificationEmail",
    backend: "sessionStorage",
    sensitivity: "pii-transient",
  },
} as const;

const LOCAL_KEY_PREFIXES = [
  "calzatura_",
  "calzatura.",
  "adminSidebarCollapsed",
  "pred_",
  "receipt_downloaded_",
  "e2e_",
] as const;

const SESSION_KEY_PREFIXES = ["calzatura.", "cv_"] as const;

const FORBIDDEN_KEY_RE = /password|passwd|secret|bearer|api[_-]?key|jwt|refresh[_-]?token|id[_-]?token/i;
const JWT_VALUE_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./;

function isAllowedKey(key: string, kind: "local" | "session"): boolean {
  if (key.startsWith("firebase:")) return true;
  const prefixes = kind === "local" ? LOCAL_KEY_PREFIXES : SESSION_KEY_PREFIXES;
  return prefixes.some((p) => key.startsWith(p));
}

export function assertAllowedBrowserStorageWrite(
  key: string,
  value: string,
  kind: "local" | "session",
): void {
  if (FORBIDDEN_KEY_RE.test(key)) {
    throw new Error(`[client-storage] clave prohibida: ${key}`);
  }
  if (!isAllowedKey(key, kind) && FORBIDDEN_KEY_RE.test(value)) {
    throw new Error(`[client-storage] valor sensible en clave no permitida: ${key}`);
  }
  if (JWT_VALUE_RE.test(value.trim())) {
    throw new Error(`[client-storage] no guardar JWT en ${kind}Storage`);
  }
}

const STORAGE_GUARD = Symbol("cvStorageGuard");

/** Bloquea escrituras accidentales de credenciales en Storage (defensa en profundidad). */
export function installClientStorageGuard(): void {
  if (globalThis.window === undefined) return;
  const proto = Storage.prototype;
  const current = proto.setItem as typeof proto.setItem & { [STORAGE_GUARD]?: boolean };
  if (current[STORAGE_GUARD]) return;

  const native = proto.setItem;
  proto.setItem = function setItemGuarded(this: Storage, key: string, value: string) {
    const kind = this === globalThis.sessionStorage ? "session" : "local";
    assertAllowedBrowserStorageWrite(key, value, kind);
    native.call(this, key, value);
  };
  (proto.setItem as typeof proto.setItem & { [STORAGE_GUARD]?: boolean })[STORAGE_GUARD] = true;
}

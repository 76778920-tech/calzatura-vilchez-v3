import { CLIENT_STORAGE } from "@/config/clientStoragePolicy";

const STORAGE_KEY = CLIENT_STORAGE.pendingVerifyEmail.key;
/** Clave legada en localStorage; se elimina al leer o guardar. */
const LEGACY_LOCAL_KEY = STORAGE_KEY;

function storage(): Storage | null {
  if (globalThis.window === undefined) return null;
  return globalThis.sessionStorage;
}

function clearLegacyLocal(): void {
  try {
    globalThis.localStorage.removeItem(LEGACY_LOCAL_KEY);
  } catch {
    // ignorar
  }
}

export function savePendingVerificationEmail(email: string): void {
  const s = storage();
  if (!s) return;
  clearLegacyLocal();
  s.setItem(STORAGE_KEY, email);
}

export function getPendingVerificationEmail(): string | null {
  const s = storage();
  if (!s) return null;
  const fromSession = s.getItem(STORAGE_KEY);
  if (fromSession) return fromSession;
  try {
    const legacy = globalThis.localStorage.getItem(LEGACY_LOCAL_KEY);
    if (legacy) {
      s.setItem(STORAGE_KEY, legacy);
      globalThis.localStorage.removeItem(LEGACY_LOCAL_KEY);
      return legacy;
    }
  } catch {
    // ignorar
  }
  return null;
}

export function clearPendingVerificationEmail(): void {
  const s = storage();
  if (s) s.removeItem(STORAGE_KEY);
  clearLegacyLocal();
}

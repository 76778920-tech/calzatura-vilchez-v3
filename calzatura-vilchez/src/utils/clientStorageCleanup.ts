import { CLIENT_STORAGE } from "@/config/clientStoragePolicy";
import { clearPendingVerificationEmail } from "@/utils/pendingVerification";

const CART_PREFIX = "calzatura_cart";
const RECEIPT_PREFIX = "receipt_downloaded_";

/** Elimina datos de sesión/carrito en el navegador; conserva tema y preferencias UI no sensibles. */
export function clearSensitiveClientStorage(): void {
  clearPendingVerificationEmail();

  try {
    sessionStorage.removeItem(CLIENT_STORAGE.chunkRecovery.key);
  } catch {
    // ignorar
  }

  for (const storage of [localStorage, sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k) keys.push(k);
      }
      for (const key of keys) {
        if (key.startsWith(CART_PREFIX) || key.startsWith(RECEIPT_PREFIX)) {
          storage.removeItem(key);
        }
      }
    } catch {
      // ignorar
    }
  }
}

const STORAGE_KEY = "calzatura.pendingVerificationEmail";

export function savePendingVerificationEmail(email: string): void {
  if (typeof globalThis.window === "undefined") return;
  globalThis.localStorage.setItem(STORAGE_KEY, email);
}

export function getPendingVerificationEmail(): string | null {
  if (typeof globalThis.window === "undefined") return null;
  return globalThis.localStorage.getItem(STORAGE_KEY);
}

export function clearPendingVerificationEmail(): void {
  if (typeof globalThis.window === "undefined") return;
  globalThis.localStorage.removeItem(STORAGE_KEY);
}

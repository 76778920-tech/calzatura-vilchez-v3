const STORAGE_KEY = "calzatura.pendingVerificationEmail";

export function savePendingVerificationEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, email);
}

export function getPendingVerificationEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function clearPendingVerificationEmail(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

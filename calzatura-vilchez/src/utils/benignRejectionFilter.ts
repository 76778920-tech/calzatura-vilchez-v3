/**
 * Extensiones de Chrome (traductor, gestores de contraseñas, etc.) suelen lanzar
 * promesas rechazadas con este mensaje. No provienen de la app.
 */
const BENIGN_UNHANDLED_REJECTION_RE =
  /message channel closed before a response was received|extension context invalidated|listener indicated an asynchronous response/i;

export function isBenignUnhandledRejection(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : reason && typeof reason === "object" && "message" in reason && typeof reason.message === "string"
          ? reason.message
          : "";
  return BENIGN_UNHANDLED_REJECTION_RE.test(message);
}

export function installBenignRejectionFilter(): void {
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isBenignUnhandledRejection(event.reason)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onWindowError = (event: ErrorEvent) => {
    if (!BENIGN_UNHANDLED_REJECTION_RE.test(event.message || "")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  globalThis.addEventListener("unhandledrejection", onUnhandledRejection, true);
  globalThis.addEventListener("error", onWindowError, true);
}

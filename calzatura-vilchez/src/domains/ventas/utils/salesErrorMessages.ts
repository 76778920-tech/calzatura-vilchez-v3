import { unknownClientErrorHttpStatus, unknownClientErrorMessage } from "@/utils/unknownClientError";

const DNI_LOOKUP_ERRORS = new Set([
  "DNI_INVALID",
  "DNI_LOOKUP_NOT_CONFIGURED",
  "DNI_NOT_FOUND",
  "DNI_LOOKUP_FAILED",
]);

export function isDniLookupError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return DNI_LOOKUP_ERRORS.has(msg);
}

export function dniLookupErrorToast(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "DNI_LOOKUP_NOT_CONFIGURED") {
    return "La busqueda por DNI aun no tiene API configurada";
  }
  if (msg === "DNI_NOT_FOUND") {
    return "No se encontraron datos para este DNI";
  }
  return "No se pudo consultar el DNI";
}

export function salesOperationErrorToast(err: unknown): string {
  const msg = unknownClientErrorMessage(err);
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
  const status = unknownClientErrorHttpStatus(err);
  const lower = `${msg} ${code}`.toLowerCase();
  if (
    lower.includes("insufficient_stock") ||
    lower.includes("insufficient_size_stock") ||
    lower.includes("stock insuficiente")
  ) {
    return "Stock insuficiente. Actualiza la lista y vuelve a intentarlo.";
  }
  if (code === "42501" || lower.includes("row-level security")) {
    return "Sin permisos para realizar esta operación.";
  }
  if (status === 401 || code === "401" || lower.includes("401") || lower.includes("unauthorized") || lower.includes("jwt")) {
    return "Sesión sin autorización para realizar esta operación.";
  }
  if (code === "PGRST202" || lower.includes("could not find the function")) {
    return "Operación no disponible en la base de datos. Aplica las migraciones pendientes.";
  }
  return `Error: ${msg || "no se pudo completar la operación"}`;
}

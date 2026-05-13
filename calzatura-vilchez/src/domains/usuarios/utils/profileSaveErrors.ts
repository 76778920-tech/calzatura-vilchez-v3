function pickMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const record = err && typeof err === "object" ? err : null;
  if (
    record &&
    "message" in record &&
    typeof record.message === "string"
  ) {
    return record.message;
  }
  return "";
}

function pickCode(err: unknown): string {
  const record = err && typeof err === "object" ? err : null;
  if (record && "code" in record) {
    return String(record.code);
  }
  return "";
}

/**
 * Mensajes de error al guardar perfil (Supabase / red / timeout).
 */
export function profileSaveErrorToast(err: unknown): string {
  const msg = pickMessage(err);
  const code = pickCode(err);
  const isPermissionError =
    code === "42501" ||
    msg.toLowerCase().includes("row-level security");

  if (msg === "TIMEOUT") {
    return "Tiempo agotado. Inténtalo de nuevo o revisa tu conexión.";
  }
  if (isPermissionError) {
    return "Sin permisos para realizar esta operación.";
  }
  if (msg.includes("not-found") || msg.includes("NOT_FOUND")) {
    return "Documento no encontrado. Recarga la pagina e intenta de nuevo";
  }
  return `Error: ${msg || "no se pudo guardar"}`;
}

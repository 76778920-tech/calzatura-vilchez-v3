function pickMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "";
}

function pickCode(err: unknown): string {
  if (typeof err === "object" && err && "code" in err) {
    return String((err as { code: unknown }).code);
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

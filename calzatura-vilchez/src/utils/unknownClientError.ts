/** Texto legible desde errores de Supabase / fetch / RPC (compartido entre pantallas admin). */
export function unknownClientErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== "object") return "";
  const fields = ["message", "details", "hint", "error", "description"] as const;
  return fields
    .map((field) => (err as Record<string, unknown>)[field])
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

/** Código HTTP si viene en el error o en `cause` (PostgREST, etc.). */
export function unknownClientErrorHttpStatus(err: unknown): number {
  if (!err || typeof err !== "object") return 0;
  const record = err as Record<string, unknown>;
  const direct = Number(record.status ?? record.statusCode);
  if (Number.isFinite(direct)) return direct;
  const cause = record.cause;
  if (cause && typeof cause === "object") {
    const nested = Number((cause as Record<string, unknown>).status ?? (cause as Record<string, unknown>).statusCode);
    if (Number.isFinite(nested)) return nested;
  }
  return 0;
}

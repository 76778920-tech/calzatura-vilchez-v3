export interface DniLookupResult {
  dni: string;
  nombres: string;
  apellidos: string;
}

const DNI_LOOKUP_URL = (import.meta.env.VITE_DNI_LOOKUP_URL as string | undefined)?.trim();

/** Consulta DNI vía POST a `VITE_DNI_LOOKUP_URL` (p. ej. Vercel `api/lookup-dni`). El servidor prueba varios proveedores en orden hasta el primer éxito. */
export function normalizeDni(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function isValidDni(value: string) {
  return /^\d{8}$/.test(value);
}

function normalizeResponse(payload: Partial<DniLookupResult>, requestedDni: string): DniLookupResult {
  const dni = normalizeDni(payload.dni ?? requestedDni);
  const nombres = payload.nombres?.trim().toUpperCase() ?? "";
  const apellidos = payload.apellidos?.trim().toUpperCase() ?? "";

  if (dni !== requestedDni || !nombres || !apellidos) {
    throw new Error("DNI_NOT_FOUND");
  }

  return { dni, nombres, apellidos };
}

export async function lookupDni(dni: string): Promise<DniLookupResult> {
  const normalized = normalizeDni(dni);
  if (!isValidDni(normalized)) {
    throw new Error("DNI_INVALID");
  }
  if (!DNI_LOOKUP_URL) {
    throw new Error("DNI_LOOKUP_NOT_CONFIGURED");
  }

  const response = await fetch(DNI_LOOKUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dni: normalized }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(response.status === 404 ? "DNI_NOT_FOUND" : "DNI_LOOKUP_FAILED");
  }

  return normalizeResponse(payload as Partial<DniLookupResult>, normalized);
}

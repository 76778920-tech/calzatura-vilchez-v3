import { getBackendApiBaseUrl } from "@/config/apiBackend";
import { assertHttpsInProduction } from "@/utils/requireHttpsInProd";
import { getToken } from "firebase/app-check";
import { getAppCheckInstance } from "@/firebase/appCheckConsent";

export interface DniLookupResult {
  dni: string;
  nombres: string;
  apellidos: string;
  lookupToken?: string;
}

const DNI_LOOKUP_URL = (import.meta.env.VITE_DNI_LOOKUP_URL as string | undefined)?.trim();

function resolveDniLookupEndpoint(): string {
  const bffBase = getBackendApiBaseUrl();
  if (bffBase) {
    return `${bffBase}/lookup-dni`;
  }
  if (DNI_LOOKUP_URL) {
    return assertHttpsInProduction(DNI_LOOKUP_URL, "VITE_DNI_LOOKUP_URL");
  }
  throw new Error("DNI_LOOKUP_NOT_CONFIGURED");
}

/** Consulta DNI vía POST al BFF (`/lookup-dni`) o a `VITE_DNI_LOOKUP_URL` si no hay BFF. */
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

function mapLookupFailure(status: number, payload: { detail?: string; error?: string }) {
  if (status === 404) return "DNI_NOT_FOUND";
  if (status === 429) return "DNI_RATE_LIMITED";
  if (status === 500 && payload.error === "Servicio no configurado") {
    return "DNI_LOOKUP_NOT_CONFIGURED";
  }
  return "DNI_LOOKUP_FAILED";
}

export function dniLookupFailureMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "DNI_LOOKUP_NOT_CONFIGURED") {
    return "La busqueda por DNI aun no tiene API configurada en el servidor";
  }
  if (msg === "DNI_NOT_FOUND") {
    return "No se encontraron datos para este DNI";
  }
  if (msg === "DNI_RATE_LIMITED") {
    return "Demasiadas consultas de DNI. Intenta en unos minutos.";
  }
  if (msg === "DNI_AUTH_MISCONFIGURED") {
    return "El servicio de DNI tiene credenciales invalidas. Contacta al administrador.";
  }
  if (err instanceof Error && err.cause && typeof err.cause === "object") {
    const detail = (err.cause as { detail?: string }).detail;
    if (detail) return detail;
  }
  return "No se pudo consultar el DNI";
}

export async function lookupDni(dni: string): Promise<DniLookupResult> {
  const normalized = normalizeDni(dni);
  if (!isValidDni(normalized)) {
    throw new Error("DNI_INVALID");
  }

  const endpoint = resolveDniLookupEndpoint();
  const appCheck = getAppCheckInstance();
  const appCheckToken = appCheck
    ? await getToken(appCheck, false).then((result) => result.token).catch(() => "")
    : "";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
    },
    body: JSON.stringify({ dni: normalized }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
    dni?: string;
    nombres?: string;
    apellidos?: string;
    lookupToken?: string;
    attempts?: Array<{ provider: string; status: number | string }>;
  };

  if (!response.ok) {
    const code = mapLookupFailure(response.status, payload);
    const authHint = payload.attempts?.some(
      (item) => item.status === 401 || item.status === 403,
    );
    const error = new Error(authHint ? "DNI_AUTH_MISCONFIGURED" : code);
    if (payload.detail) {
      error.cause = { detail: payload.detail };
    }
    throw error;
  }

  if (import.meta.env.DEV) {
    const provider = response.headers.get("X-DNI-Provider");
    if (provider) console.debug(`[lookupDni] proveedor: ${provider}`);
  }

  return {
    ...normalizeResponse(payload, normalized),
    lookupToken: typeof payload.lookupToken === "string" ? payload.lookupToken : undefined,
  };
}

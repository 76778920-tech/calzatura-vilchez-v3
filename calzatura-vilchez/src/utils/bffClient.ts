import { auth } from "@/firebase/config";
import { getBackendApiBaseUrl } from "@/config/apiBackend";

export async function bffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Debes iniciar sesion");
  }
  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada");
  }
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Intenta otra vez en unos segundos.");
  }
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Error en el servidor");
  }
  return payload;
}

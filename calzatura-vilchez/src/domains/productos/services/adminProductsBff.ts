import { auth } from "@/firebase/config";
import { getBackendApiBaseUrl } from "@/config/apiBackend";

export async function postAdminBff<T = unknown>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Debes iniciar sesion para administrar productos");
  }

  const base = getBackendApiBaseUrl();
  if (!base) {
    throw new Error("VITE_BACKEND_API_URL no configurada (admin productos)");
  }

  const idToken = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Intenta otra vez en unos segundos.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload.error === "string" ? payload.error : "No se pudo completar la operacion";
    throw new Error(message);
  }

  return payload as T;
}

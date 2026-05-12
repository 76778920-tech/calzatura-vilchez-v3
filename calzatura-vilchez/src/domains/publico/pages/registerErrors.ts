import toast from "react-hot-toast";
import { MAX_AUTH_PASSWORD_LENGTH, MIN_AUTH_PASSWORD_LENGTH } from "@/config/authCredentials";

/** Mensaje de toast para errores de registro Firebase / validación previa. */
export function toastRegisterCreateError(err: unknown): void {
  const code = (err as { code?: string })?.code ?? "";
  const msg = err instanceof Error ? err.message : "";

  if (msg === "DISPOSABLE_EMAIL") {
    toast.error("Este correo es temporal o desechable. Usa un correo real.");
    return;
  }
  if (msg === "PASSWORD_TOO_SHORT") {
    toast.error(`La contraseña debe tener al menos ${MIN_AUTH_PASSWORD_LENGTH} caracteres`);
    return;
  }
  if (msg === "PASSWORD_TOO_LONG") {
    toast.error(
      `La contraseña supera el límite permitido. Usa como máximo ${MAX_AUTH_PASSWORD_LENGTH} caracteres.`,
    );
    return;
  }
  if (code.includes("weak-password")) {
    toast.error("La contraseña es demasiado débil. Usa más caracteres o combina letras, números y símbolos.");
    return;
  }
  if (code.includes("email-already-in-use") || msg.includes("email-already-in-use")) {
    toast.error(
      "No se pudo crear la cuenta con ese correo. Si ya tenías cuenta, inicia sesión; si no, revisa los datos o intenta más tarde.",
    );
    return;
  }
  if (code.includes("permission-denied") || msg.includes("insufficient permissions")) {
    toast.error("Error de permisos. Intenta de nuevo o contacta al soporte.");
    return;
  }
  if (code.includes("network-request-failed") || msg.includes("Failed to fetch")) {
    toast.error("Sin conexion. Verifica tu internet");
    return;
  }
  toast.error("No se pudo crear la cuenta. Intenta de nuevo o contacta al soporte.");
}

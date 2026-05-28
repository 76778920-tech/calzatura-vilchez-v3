import toast from "react-hot-toast";
import type { NavigateFunction } from "react-router-dom";
import { isSuperAdminEmail } from "@/config/security";
import { validateLoginPasswordLength } from "@/config/authCredentials";
import { ensureVerifiedUserProfile, loginUser, resetPassword } from "@/domains/usuarios/services/auth";
import { getPostLoginRedirect } from "@/routes/redirects";
import { PUBLIC_ROUTES } from "@/routes/paths";
import { normalizeEmailInput, validateEmailFormat } from "@/utils/emailValidation";
import { clearPendingVerificationEmail, savePendingVerificationEmail } from "@/utils/pendingVerification";
import type { User } from "firebase/auth";
import type { UserProfile, UserRole } from "@/types";

export type LoginFieldErrors = { email?: string; password?: string };

export function showLoginFailure(err: unknown) {
  if (err instanceof Error && err.message === "LOGIN_RATE_LIMITED") {
    toast.error("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
    return;
  }
  toast.error("Correo o contraseña incorrectos");
}

export async function sendPasswordReset(email: string) {
  try {
    await resetPassword(email);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/too-many-requests") {
      toast.error("Demasiados intentos. Intenta más tarde.");
      return;
    }
  }
  toast.success(
    "Si ese correo está registrado, recibirás instrucciones para restablecer la contraseña. Revisa la bandeja de entrada y el spam.",
  );
}

export function validateLoginFields(email: string, password: string): LoginFieldErrors {
  const emailErr = validateEmailFormat(email);
  const passErr = validateLoginPasswordLength(password);
  if (!emailErr && !passErr) return {};
  return { email: emailErr || undefined, password: passErr || undefined };
}

export async function requestPasswordReset(email: string): Promise<LoginFieldErrors> {
  const target = email.trim();
  if (!target) {
    return { email: "Ingresa tu correo para restablecer la contraseña" };
  }
  const emailErr = validateEmailFormat(target);
  if (emailErr) return { email: emailErr };
  await sendPasswordReset(target);
  return {};
}

async function navigateAfterLogin(
  loggedUser: User,
  profile: UserProfile | null,
  emailNorm: string,
  redirectParam: string | null,
  navigate: NavigateFunction,
) {
  const isAdmin = isSuperAdminEmail(loggedUser.email) || profile?.rol === "admin";

  if (!loggedUser.emailVerified && !isAdmin) {
    savePendingVerificationEmail(loggedUser.email ?? emailNorm);
    toast("Confirma tu correo para continuar.", { icon: "✉️" });
    navigate(PUBLIC_ROUTES.verifyEmail, { replace: true });
    return;
  }

  clearPendingVerificationEmail();
  const role: UserRole = profile?.rol ?? (isAdmin ? "admin" : "cliente");
  const redirect = getPostLoginRedirect({
    redirect: redirectParam,
    role,
    email: loggedUser.email,
  });

  toast.success(isAdmin ? "Bienvenido al panel administrativo" : "Bienvenido");
  navigate(redirect, { replace: true });
}

export async function submitLogin(
  email: string,
  password: string,
  redirectParam: string | null,
  navigate: NavigateFunction,
) {
  const emailNorm = normalizeEmailInput(email);
  const loggedUser = await loginUser(emailNorm, password);
  const profile = await ensureVerifiedUserProfile(loggedUser);
  await navigateAfterLogin(loggedUser, profile, emailNorm, redirectParam, navigate);
}

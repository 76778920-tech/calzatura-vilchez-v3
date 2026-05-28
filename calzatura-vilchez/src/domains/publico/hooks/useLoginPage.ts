import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { isSuperAdminEmail } from "@/config/security";
import { ensureVerifiedUserProfile, loginUser, resetPassword } from "@/domains/usuarios/services/auth";
import { getPostLoginRedirect } from "@/routes/redirects";
import { PUBLIC_ROUTES } from "@/routes/paths";
import { normalizeEmailInput, validateEmailFormat } from "@/utils/emailValidation";
import { clearPendingVerificationEmail, savePendingVerificationEmail } from "@/utils/pendingVerification";
import { validateLoginPasswordLength } from "@/config/authCredentials";
import type { User } from "firebase/auth";
import type { UserProfile, UserRole } from "@/types";

type LoginFieldErrors = { email?: string; password?: string };

function showLoginFailure(err: unknown) {
  if (err instanceof Error && err.message === "LOGIN_RATE_LIMITED") {
    toast.error("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
    return;
  }
  toast.error("Correo o contraseña incorrectos");
}

async function sendPasswordReset(email: string) {
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

async function navigateAfterLogin(
  loggedUser: User,
  profile: UserProfile | null,
  emailNorm: string,
  searchParams: URLSearchParams,
  navigate: ReturnType<typeof useNavigate>,
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
    redirect: searchParams.get("redirect"),
    role,
    email: loggedUser.email,
  });

  toast.success(isAdmin ? "Bienvenido al panel administrativo" : "Bienvenido");
  navigate(redirect, { replace: true });
}

export function useLoginPage(variant: "client" | "admin") {
  const isAdminLogin = variant === "admin";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const clearFieldError = (field: keyof LoginFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleForgotPassword = async () => {
    const target = email.trim();
    if (!target) {
      setFieldErrors({ email: "Ingresa tu correo para restablecer la contraseña" });
      return;
    }
    const emailErr = validateEmailFormat(target);
    if (emailErr) {
      setFieldErrors({ email: emailErr });
      return;
    }
    await sendPasswordReset(target);
  };

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();

    const emailErr = validateEmailFormat(email);
    const passErr = validateLoginPasswordLength(password);
    if (emailErr || passErr) {
      setFieldErrors({ email: emailErr || undefined, password: passErr || undefined });
      return;
    }
    setFieldErrors({});

    const emailNorm = normalizeEmailInput(email);
    setLoading(true);

    try {
      const loggedUser = await loginUser(emailNorm, password);
      const profile = await ensureVerifiedUserProfile(loggedUser);
      await navigateAfterLogin(loggedUser, profile, emailNorm, searchParams, navigate);
    } catch (err) {
      showLoginFailure(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    isAdminLogin,
    email,
    setEmail,
    password,
    setPassword,
    showPass,
    setShowPass,
    loading,
    fieldErrors,
    clearFieldError,
    handleForgotPassword,
    handleLogin,
  };
}

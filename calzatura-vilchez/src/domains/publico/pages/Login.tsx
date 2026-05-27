import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { ensureVerifiedUserProfile, loginUser, resetPassword } from "@/domains/usuarios/services/auth";
import { isSuperAdminEmail } from "@/config/security";
import { getPostLoginRedirect } from "@/routes/redirects";
import { PUBLIC_ROUTES } from "@/routes/paths";
import toast from "react-hot-toast";
import { MAX_AUTH_EMAIL_INPUT_LENGTH, MAX_AUTH_PASSWORD_LENGTH, validateLoginPasswordLength } from "@/config/authCredentials";
import { normalizeEmailInput, validateEmailFormat } from "@/utils/emailValidation";
import { clearPendingVerificationEmail, savePendingVerificationEmail } from "@/utils/pendingVerification";
import type { UserRole } from "@/types";

const NO_BROWSER_AUTOCOMPLETE = "off" as const;

type LoginProps = Readonly<{
  /** `admin`: sin autocompletado (equipos compartidos en tienda). `client`: comportamiento estándar. */
  variant?: "client" | "admin";
}>;

export default function Login({ variant = "client" }: LoginProps) {
  const isAdminLogin = variant === "admin";
  useDocumentTitle(isAdminLogin ? "Acceso administrativo" : "Iniciar sesión");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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
    try {
      await resetPassword(target);
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
    } catch {
      // ISO/IEC 27002: un solo mensaje ante fallo de credenciales; no exponer códigos ni si el correo existe.
      toast.error("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <ellipse key={a} cx="20" cy="7.5" rx="3" ry="6.5" fill="#C9A227" transform={`rotate(${a} 20 20)`} />
            ))}
            <circle cx="20" cy="20" r="7" fill="#3d2008" />
            <circle cx="20" cy="20" r="5.5" fill="#2d1505" />
          </svg>
        </div>
        <h1 className="auth-title">{isAdminLogin ? "Panel administrativo" : "Iniciar Sesión"}</h1>
        <p className="auth-subtitle">
          {isAdminLogin ? "Acceso solo para personal autorizado" : "Bienvenido de vuelta"}
        </p>

        <form
          onSubmit={handleLogin}
          className="auth-form"
          autoComplete={isAdminLogin ? NO_BROWSER_AUTOCOMPLETE : undefined}
          data-form-type={isAdminLogin ? "other" : undefined}
        >
          <div className="input-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete={isAdminLogin ? NO_BROWSER_AUTOCOMPLETE : "email"}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                required
                maxLength={MAX_AUTH_EMAIL_INPUT_LENGTH}
                placeholder="tu@correo.com"
                className={`form-input with-icon${fieldErrors.email ? " input-error" : ""}`}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              />
            </div>
            {fieldErrors.email && <p id="login-email-error" className="field-error" role="alert">{fieldErrors.email}</p>}
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Contraseña</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password"
                name="password"
                type={showPass ? "text" : "password"}
                autoComplete={isAdminLogin ? NO_BROWSER_AUTOCOMPLETE : "current-password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                required
                maxLength={MAX_AUTH_PASSWORD_LENGTH}
                placeholder="••••••••"
                className={`form-input with-icon${fieldErrors.password ? " input-error" : ""}`}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="input-toggle"
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p id="login-password-error" className="field-error" role="alert">{fieldErrors.password}</p>}
          </div>

          <div style={{ textAlign: "right", marginTop: "-4px" }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary-text)", fontSize: "13px", fontWeight: 600, padding: 0 }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-full">
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="auth-footer">
          {isAdminLogin ? (
            <>
              ¿Eres cliente?{" "}
              <Link to={PUBLIC_ROUTES.login} className="auth-link">Inicia sesión en la tienda</Link>
            </>
          ) : (
            <>
              ¿No tienes cuenta?{" "}
              <Link to={PUBLIC_ROUTES.register} className="auth-link">Regístrate aquí</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

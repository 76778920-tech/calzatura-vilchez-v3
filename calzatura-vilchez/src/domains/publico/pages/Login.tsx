import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLoginPage } from "@/domains/publico/hooks/useLoginPage";
import { PUBLIC_ROUTES } from "@/routes/paths";
import { MAX_AUTH_EMAIL_INPUT_LENGTH, MAX_AUTH_PASSWORD_LENGTH } from "@/config/authCredentials";

const NO_BROWSER_AUTOCOMPLETE = "off" as const;

type LoginProps = Readonly<{
  /** `admin`: sin autocompletado (equipos compartidos en tienda). `client`: comportamiento estándar. */
  variant?: "client" | "admin";
}>;

function LoginBrandLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="20" cy="7.5" rx="3" ry="6.5" fill="#C9A227" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="7" fill="#3d2008" />
      <circle cx="20" cy="20" r="5.5" fill="#2d1505" />
    </svg>
  );
}

function LoginAuthFooter({ isAdminLogin }: Readonly<{ isAdminLogin: boolean }>) {
  if (isAdminLogin) {
    return (
      <p className="auth-footer">
        ¿Eres cliente?{" "}
        <Link to={PUBLIC_ROUTES.login} className="auth-link">
          Inicia sesión en la tienda
        </Link>
      </p>
    );
  }
  return (
    <p className="auth-footer">
      ¿No tienes cuenta?{" "}
      <Link to={PUBLIC_ROUTES.register} className="auth-link">
        Regístrate aquí
      </Link>
    </p>
  );
}

export default function Login({ variant = "client" }: LoginProps) {
  const {
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
  } = useLoginPage(variant);

  useDocumentTitle(isAdminLogin ? "Acceso administrativo" : "Iniciar sesión");

  const emailAutoComplete = isAdminLogin ? NO_BROWSER_AUTOCOMPLETE : "email";
  const passwordAutoComplete = isAdminLogin ? NO_BROWSER_AUTOCOMPLETE : "current-password";

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <LoginBrandLogo />
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
                autoComplete={emailAutoComplete}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                required
                maxLength={MAX_AUTH_EMAIL_INPUT_LENGTH}
                placeholder="tu@correo.com"
                className={`form-input with-icon${fieldErrors.email ? " input-error" : ""}`}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              />
            </div>
            {fieldErrors.email ? (
              <p id="login-email-error" className="field-error" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Contraseña</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password"
                name="password"
                type={showPass ? "text" : "password"}
                autoComplete={passwordAutoComplete}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
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
            {fieldErrors.password ? (
              <p id="login-password-error" className="field-error" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div style={{ textAlign: "right", marginTop: "-4px" }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--primary-text)",
                fontSize: "13px",
                fontWeight: 600,
                padding: 0,
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-full">
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <LoginAuthFooter isAdminLogin={isAdminLogin} />
      </div>
    </main>
  );
}

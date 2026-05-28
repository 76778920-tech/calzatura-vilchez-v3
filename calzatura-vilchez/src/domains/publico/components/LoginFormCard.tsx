import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { MAX_AUTH_EMAIL_INPUT_LENGTH, MAX_AUTH_PASSWORD_LENGTH } from "@/config/authCredentials";
import type { LoginFieldErrors } from "@/domains/publico/utils/loginPageFlow";
import type { LoginPageViewModel } from "@/domains/publico/utils/loginPageViewModel";
import { PUBLIC_ROUTES } from "@/routes/paths";

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

type LoginFormCardProps = Readonly<{
  viewModel: LoginPageViewModel;
  email: string;
  password: string;
  showPass: boolean;
  fieldErrors: LoginFieldErrors;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onClearFieldError: (field: keyof LoginFieldErrors) => void;
  onForgotPassword: () => void;
  onSubmit: (e: { preventDefault(): void }) => void;
}>;

export function LoginFormCard({
  viewModel,
  email,
  password,
  showPass,
  fieldErrors,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onClearFieldError,
  onForgotPassword,
  onSubmit,
}: LoginFormCardProps) {
  const emailErrorId = fieldErrors.email ? "login-email-error" : undefined;
  const passwordErrorId = fieldErrors.password ? "login-password-error" : undefined;

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <LoginBrandLogo />
      </div>
      <h1 className="auth-title">{viewModel.heading}</h1>
      <p className="auth-subtitle">{viewModel.subtitle}</p>

      <form
        onSubmit={onSubmit}
        className="auth-form"
        autoComplete={viewModel.formAutoComplete}
        data-form-type={viewModel.formDataType}
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
              autoComplete={viewModel.emailAutoComplete}
              value={email}
              onChange={(e) => {
                onEmailChange(e.target.value);
                onClearFieldError("email");
              }}
              required
              maxLength={MAX_AUTH_EMAIL_INPUT_LENGTH}
              placeholder="tu@correo.com"
              className={`form-input with-icon${fieldErrors.email ? " input-error" : ""}`}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={emailErrorId}
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
              type={viewModel.passwordInputType}
              autoComplete={viewModel.passwordAutoComplete}
              value={password}
              onChange={(e) => {
                onPasswordChange(e.target.value);
                onClearFieldError("password");
              }}
              required
              maxLength={MAX_AUTH_PASSWORD_LENGTH}
              placeholder="••••••••"
              className={`form-input with-icon${fieldErrors.password ? " input-error" : ""}`}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={passwordErrorId}
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="input-toggle"
              aria-label={viewModel.passwordToggleLabel}
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
            onClick={onForgotPassword}
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

        <button type="submit" disabled={viewModel.submitDisabled} className="btn-primary btn-full">
          {viewModel.submitLabel}
        </button>
      </form>

      <LoginAuthFooter isAdminLogin={viewModel.isAdminLogin} />
    </div>
  );
}

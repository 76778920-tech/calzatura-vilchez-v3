import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink } from "@/components/common/ExternalLink";
import { IdCard, User, Mail, Lock, Eye, EyeOff, Search, Smartphone } from "lucide-react";
import { checkDisposableEmail, registerUser } from "@/domains/usuarios/services/auth";
import { INFO_ROUTES, PUBLIC_ROUTES } from "@/routes/paths";
import { dniLookupFailureMessage, isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import { getNormalizedRegisterEmail, getRegisterFieldErrors, type RegisterFieldErrors } from "./registerFormValidation";
import { savePendingVerificationEmail } from "@/utils/pendingVerification";
import toast from "react-hot-toast";
import { toastRegisterCreateError } from "./registerErrors";
import { MAX_AUTH_EMAIL_INPUT_LENGTH, MAX_AUTH_PASSWORD_LENGTH } from "@/config/authCredentials";

export default function Register() {
  useDocumentTitle("Crear cuenta");
  const navigate = useNavigate();
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [celular, setCelular] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [lookingUpDni, setLookingUpDni] = useState(false);
  const [validatedDni, setValidatedDni] = useState("");
  const [dniLookupToken, setDniLookupToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  const showDniLookupError = (err: unknown) => {
    toast.error(dniLookupFailureMessage(err));
  };

  const handleDniLookup = async () => {
    const normalized = normalizeDni(dni);
    setDni(normalized);

    if (!isValidDni(normalized)) {
      setFieldErrors((prev) => ({ ...prev, dni: "Ingresa un DNI válido de 8 dígitos" }));
      return;
    }

    setLookingUpDni(true);
    try {
      const person = await lookupDni(normalized);
      if (!person.lookupToken) {
        throw new Error("DNI_LOOKUP_FAILED");
      }
      setNombres(person.nombres);
      setApellidos(person.apellidos);
      setValidatedDni(normalized);
      setDniLookupToken(person.lookupToken);
      toast.success("Datos encontrados");
    } catch (err: unknown) {
      setValidatedDni("");
      setDniLookupToken("");
      showDniLookupError(err);
    } finally {
      setLookingUpDni(false);
    }
  };

  const handleRegister = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const errors = getRegisterFieldErrors({ dni, validatedDni, nombres, apellidos, password, confirmPass, email, celular });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!dniLookupToken) {
      setFieldErrors({ dni: "Vuelve a validar el DNI antes de crear la cuenta" });
      return;
    }
    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones para continuar");
      return;
    }
    const emailNorm = getNormalizedRegisterEmail(email);

    setLoading(true);
    try {
      await checkDisposableEmail(emailNorm);
      await registerUser({
        dni: validatedDni,
        nombres,
        apellidos,
        email: emailNorm,
        password,
        celular,
        lookupToken: dniLookupToken,
      });
      savePendingVerificationEmail(emailNorm);
      navigate(PUBLIC_ROUTES.verifyEmail, { replace: true });
    } catch (err: unknown) {
      console.error("[Register] error al crear cuenta:", err);
      toastRegisterCreateError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
            {[0,45,90,135,180,225,270,315].map((a) => (
              <ellipse key={a} cx="20" cy="7.5" rx="3" ry="6.5" fill="#C9A227" transform={`rotate(${a} 20 20)`} />
            ))}
            <circle cx="20" cy="20" r="7" fill="#3d2008" />
            <circle cx="20" cy="20" r="5.5" fill="#2d1505" />
          </svg>
        </div>
        <h1 className="auth-title">Crear Cuenta</h1>
        <p className="auth-subtitle">Únete a Calzatura Vilchez</p>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="input-group">
            <label htmlFor="register-dni">DNI</label>
            <div className="input-wrapper">
              <IdCard size={16} className="input-icon" />
              <input
                id="register-dni"
                name="dni"
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => {
                  const nextDni = normalizeDni(e.target.value);
                  setDni(nextDni);
                  setFieldErrors((prev) => ({ ...prev, dni: undefined }));
                  if (nextDni !== validatedDni) {
                    setValidatedDni("");
                    setDniLookupToken("");
                    setNombres("");
                    setApellidos("");
                  }
                }}
                required
                minLength={8}
                maxLength={8}
                placeholder="12345678"
                className={`form-input with-icon with-action${fieldErrors.dni ? " input-error" : ""}`}
                aria-invalid={!!fieldErrors.dni}
                aria-describedby={fieldErrors.dni ? "register-dni-error" : undefined}
              />
              <button
                type="button"
                onClick={handleDniLookup}
                disabled={lookingUpDni || dni.length !== 8}
                className="input-action-btn"
                title="Buscar datos por DNI"
              >
                <Search size={15} />
              </button>
            </div>
            {fieldErrors.dni && <p id="register-dni-error" className="field-error" role="alert">{fieldErrors.dni}</p>}
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="register-nombres">Nombres</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="register-nombres"
                  name="nombres"
                  type="text"
                  value={nombres}
                  disabled
                  placeholder="Se completa con el DNI"
                  className="form-input with-icon disabled-field"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="register-apellidos">Apellidos</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="register-apellidos"
                  name="apellidos"
                  type="text"
                  value={apellidos}
                  disabled
                  placeholder="Se completa con el DNI"
                  className="form-input with-icon disabled-field"
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-email">Correo electrónico</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="register-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                required
                maxLength={MAX_AUTH_EMAIL_INPUT_LENGTH}
                placeholder="tu@correo.com"
                className={`form-input with-icon${fieldErrors.email ? " input-error" : ""}`}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
              />
            </div>
            {fieldErrors.email && <p id="register-email-error" className="field-error" role="alert">{fieldErrors.email}</p>}
          </div>

          <div className="input-group">
            <label htmlFor="register-celular">Celular</label>
            <div className="input-wrapper">
              <Smartphone size={16} className="input-icon" />
              <input
                id="register-celular"
                name="celular"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={celular}
                onChange={(e) => { setCelular(e.target.value.replace(/\D/g, "").slice(0, 9)); setFieldErrors((prev) => ({ ...prev, celular: undefined })); }}
                required
                maxLength={9}
                placeholder="9XXXXXXXX"
                className={`form-input with-icon${fieldErrors.celular ? " input-error" : ""}`}
                aria-invalid={!!fieldErrors.celular}
                aria-describedby={fieldErrors.celular ? "register-celular-error" : undefined}
              />
            </div>
            {fieldErrors.celular && <p id="register-celular-error" className="field-error" role="alert">{fieldErrors.celular}</p>}
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="register-password">Contraseña</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="register-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                  required
                  maxLength={MAX_AUTH_PASSWORD_LENGTH}
                  placeholder="Minimo 8 caracteres"
                  className={`form-input with-icon${fieldErrors.password ? " input-error" : ""}`}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
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
              {fieldErrors.password && <p id="register-password-error" className="field-error" role="alert">{fieldErrors.password}</p>}
            </div>

            <div className="input-group">
              <label htmlFor="register-confirm-password">Confirmar contraseña</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="register-confirm-password"
                  name="password-confirm"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPass}
                  onChange={(e) => { setConfirmPass(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPass: undefined })); }}
                  required
                  maxLength={MAX_AUTH_PASSWORD_LENGTH}
                  placeholder="Repite tu contraseña"
                  className={`form-input with-icon${fieldErrors.confirmPass ? " input-error" : ""}`}
                  aria-invalid={!!fieldErrors.confirmPass}
                  aria-describedby={fieldErrors.confirmPass ? "register-confirm-error" : undefined}
                />
              </div>
              {fieldErrors.confirmPass && <p id="register-confirm-error" className="field-error" role="alert">{fieldErrors.confirmPass}</p>}
            </div>
          </div>

          <label className="register-terms-label">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="register-terms-checkbox"
            />
            <span>
              Acepto los{" "}
              <ExternalLink href={INFO_ROUTES.legalTerminos} className="auth-link">
                Términos y condiciones
              </ExternalLink>{" "}
              y la{" "}
              <ExternalLink href={INFO_ROUTES.legalPrivacidad} className="auth-link">
                Política de privacidad
              </ExternalLink>
            </span>
          </label>

          <button type="submit" disabled={loading || !acceptedTerms} className="btn-primary btn-full">
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <p className="auth-footer">
          Ya tienes cuenta?{" "}
          <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
        </p>
      </div>
    </main>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IdCard, User, Mail, Lock, Eye, EyeOff, Search } from "lucide-react";
import { checkDisposableEmail, registerUser } from "@/domains/usuarios/services/auth";
import { PUBLIC_ROUTES } from "@/routes/paths";
import { isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import { getNormalizedRegisterEmail, getRegisterBlockingMessage } from "./registerFormValidation";
import { savePendingVerificationEmail } from "@/utils/pendingVerification";
import toast from "react-hot-toast";
import { toastRegisterCreateError } from "./registerErrors";
import { MAX_AUTH_EMAIL_INPUT_LENGTH, MAX_AUTH_PASSWORD_LENGTH } from "@/config/authCredentials";

export default function Register() {
  const navigate = useNavigate();
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [lookingUpDni, setLookingUpDni] = useState(false);
  const [validatedDni, setValidatedDni] = useState("");
  const [loading, setLoading] = useState(false);

  const showDniLookupError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "DNI_LOOKUP_NOT_CONFIGURED") {
      toast.error("La busqueda por DNI aun no tiene API configurada");
    } else if (msg === "DNI_NOT_FOUND") {
      toast.error("No se encontraron datos para este DNI");
    } else {
      toast.error("No se pudo consultar el DNI");
    }
  };

  const handleDniLookup = async () => {
    const normalized = normalizeDni(dni);
    setDni(normalized);

    if (!isValidDni(normalized)) {
      toast.error("Ingresa un DNI valido de 8 digitos");
      return;
    }

    setLookingUpDni(true);
    try {
      const person = await lookupDni(normalized);
      setNombres(person.nombres);
      setApellidos(person.apellidos);
      setValidatedDni(normalized);
      toast.success("Datos encontrados");
    } catch (err: unknown) {
      setValidatedDni("");
      showDniLookupError(err);
    } finally {
      setLookingUpDni(false);
    }
  };

  const handleRegister = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const blocking = getRegisterBlockingMessage({
      dni,
      validatedDni,
      nombres,
      apellidos,
      password,
      confirmPass,
      email,
    });
    if (blocking) {
      toast.error(blocking);
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
        <p className="auth-subtitle">Unete a Calzatura Vilchez</p>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="input-group">
            <label htmlFor="register-dni">DNI</label>
            <div className="input-wrapper">
              <IdCard size={16} className="input-icon" />
              <input
                id="register-dni"
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => {
                  const nextDni = normalizeDni(e.target.value);
                  setDni(nextDni);
                  if (nextDni !== validatedDni) {
                    setValidatedDni("");
                    setNombres("");
                    setApellidos("");
                  }
                }}
                required
                minLength={8}
                maxLength={8}
                placeholder="12345678"
                className="form-input with-icon with-action"
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
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="register-nombres">Nombres</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="register-nombres"
                  type="text"
                  value={nombres}
                  disabled
                  placeholder="Se completa con el DNI"
                  className="form-input with-icon"
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="register-apellidos">Apellidos</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="register-apellidos"
                  type="text"
                  value={apellidos}
                  disabled
                  placeholder="Se completa con el DNI"
                  className="form-input with-icon"
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-email">Correo electronico</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="register-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={MAX_AUTH_EMAIL_INPUT_LENGTH}
                placeholder="tu@correo.com"
                className="form-input with-icon"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="register-password">Contrasena</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="register-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={MAX_AUTH_PASSWORD_LENGTH}
                  placeholder="Minimo 8 caracteres"
                  className="form-input with-icon"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="input-toggle">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="register-confirm-password">Confirmar contraseña</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="register-confirm-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  maxLength={MAX_AUTH_PASSWORD_LENGTH}
                  placeholder="Repite tu contraseña"
                  className="form-input with-icon"
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-full">
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

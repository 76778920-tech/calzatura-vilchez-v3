import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IdCard, User, Mail, Lock, Eye, EyeOff, Search } from "lucide-react";
import { registerUser } from "@/domains/usuarios/services/auth";
import { isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import toast from "react-hot-toast";

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

    const normalizedDni = normalizeDni(dni);
    if (!isValidDni(normalizedDni)) {
      toast.error("El DNI debe tener 8 digitos");
      return;
    }
    if (password !== confirmPass) {
      toast.error("Las contrasenas no coinciden");
      return;
    }
    if (password.length < 6) {
      toast.error("La contrasena debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const person = await lookupDni(normalizedDni);
      setNombres(person.nombres);
      setApellidos(person.apellidos);
      setValidatedDni(normalizedDni);

      await registerUser({
        dni: normalizedDni,
        nombres: person.nombres,
        apellidos: person.apellidos,
        email,
        password,
      });
      toast.success("Cuenta creada exitosamente");
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar";
      if (msg.includes("email-already-in-use")) {
        toast.error("Este correo ya esta registrado");
      } else if (msg === "DNI_LOOKUP_NOT_CONFIGURED" || msg === "DNI_NOT_FOUND" || msg === "DNI_LOOKUP_FAILED") {
        showDniLookupError(err);
      } else {
        toast.error("Error al crear la cuenta");
      }
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
            <label>DNI</label>
            <div className="input-wrapper">
              <IdCard size={16} className="input-icon" />
              <input
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
              <label>Nombres</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
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
              <label>Apellidos</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
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
            <label>Correo electronico</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="form-input with-icon"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Contrasena</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimo 6 caracteres"
                  className="form-input with-icon"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="input-toggle">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirmar contrasena</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  placeholder="Repite tu contrasena"
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
          <Link to="/login" className="auth-link">Inicia sesion aqui</Link>
        </p>
      </div>
    </main>
  );
}

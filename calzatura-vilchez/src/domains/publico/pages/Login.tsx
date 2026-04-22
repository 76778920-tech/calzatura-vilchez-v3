import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { loginUser } from "@/domains/usuarios/services/auth";
import { isSuperAdminEmail } from "@/config/security";
import { getPostLoginRedirect } from "@/routes/redirects";
import { getUserProfile } from "@/domains/usuarios/services/users";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedUser = await loginUser(email, password);
      const profile = await getUserProfile(loggedUser.uid).catch(() => null);
      const redirect = getPostLoginRedirect({
        redirect: searchParams.get("redirect"),
        role: profile?.rol,
        email: loggedUser.email,
      });

      toast.success(
        isSuperAdminEmail(loggedUser.email) || profile?.rol === "admin"
          ? "Bienvenido al panel administrativo"
          : "Bienvenido"
      );
      navigate(redirect, { replace: true });
    } catch {
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
            {[0,45,90,135,180,225,270,315].map((a) => (
              <ellipse key={a} cx="20" cy="7.5" rx="3" ry="6.5" fill="#C9A227" transform={`rotate(${a} 20 20)`} />
            ))}
            <circle cx="20" cy="20" r="7" fill="#3d2008" />
            <circle cx="20" cy="20" r="5.5" fill="#2d1505" />
          </svg>
        </div>
        <h1 className="auth-title">Iniciar Sesión</h1>
        <p className="auth-subtitle">Bienvenido de vuelta</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <label>Correo electrónico</label>
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

          <div className="input-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="form-input with-icon"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="input-toggle"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-full">
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="auth-link">Regístrate aquí</Link>
        </p>
      </div>
    </main>
  );
}

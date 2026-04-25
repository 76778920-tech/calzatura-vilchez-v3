import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MailCheck, RefreshCw, LogIn } from "lucide-react";
import { resendVerificationEmail, reloadCurrentUser } from "@/domains/usuarios/services/auth";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { PUBLIC_ROUTES } from "@/routes/paths";
import toast from "react-hot-toast";

export default function VerifyEmail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user?.emailVerified) {
      navigate(PUBLIC_ROUTES.home, { replace: true });
      return;
    }
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const verified = await reloadCurrentUser();
        if (verified) {
          toast.success("¡Correo verificado! Bienvenido.");
          navigate(PUBLIC_ROUTES.home, { replace: true });
        }
      } catch {
        // ignorar errores de red en el polling
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success("Correo reenviado. Revisa tu bandeja de entrada.");
      setCooldown(60);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code.includes("too-many-requests")) {
        toast.error("Demasiados intentos. Espera unos minutos.");
      } else {
        toast.error("No se pudo reenviar el correo.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      const verified = await reloadCurrentUser();
      if (verified) {
        toast.success("¡Correo verificado! Bienvenido.");
        navigate(PUBLIC_ROUTES.home, { replace: true });
      } else {
        toast.error("Aún no hemos recibido tu confirmación. Revisa tu correo.");
      }
    } catch {
      toast.error("No se pudo verificar el estado.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <MailCheck size={44} strokeWidth={1.5} color="var(--gold)" />
        </div>

        <h1 className="auth-title">Verifica tu correo</h1>
        <p className="auth-subtitle">
          Enviamos un link de confirmación a{" "}
          <strong>{user?.email ?? "tu correo"}</strong>.
          Revisa tu bandeja de entrada y también la carpeta de spam.
        </p>

        <div className="auth-form" style={{ gap: "0.75rem" }}>
          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking}
            className="btn-primary btn-full"
          >
            {checking
              ? "Verificando..."
              : <><RefreshCw size={15} style={{ marginRight: 6 }} />Ya confirmé mi correo</>}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="btn-secondary btn-full"
          >
            {resending
              ? "Enviando..."
              : cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : "Reenviar correo de confirmación"}
          </button>
        </div>

        <p className="auth-footer">
          <button
            type="button"
            className="auth-link"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => navigate(PUBLIC_ROUTES.login)}
          >
            <LogIn size={13} style={{ marginRight: 4 }} />
            Volver al inicio de sesión
          </button>
        </p>
      </div>
    </main>
  );
}

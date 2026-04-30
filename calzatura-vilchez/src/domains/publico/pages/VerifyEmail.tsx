import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailCheck, RefreshCw, LogIn, ShieldCheck, Clock3, Sparkles } from "lucide-react";
import { getCurrentAuthUser, reloadCurrentUser, resendVerificationEmail } from "@/domains/usuarios/services/auth";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { PUBLIC_ROUTES } from "@/routes/paths";
import { clearPendingVerificationEmail, getPendingVerificationEmail } from "@/utils/pendingVerification";
import toast from "react-hot-toast";

export default function VerifyEmail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verificationUser = user ?? getCurrentAuthUser();

  const pendingEmail = useMemo(
    () => verificationUser?.email ?? getPendingVerificationEmail() ?? "tu correo",
    [verificationUser?.email]
  );

  const handleVerifiedSuccess = useCallback(() => {
    clearPendingVerificationEmail();
    toast.success("Correo verificado. Bienvenido.");
    window.location.replace(PUBLIC_ROUTES.home);
  }, []);

  const checkVerificationStatus = useCallback(async () => {
    const verified = await reloadCurrentUser();
    if (!verified) return false;
    handleVerifiedSuccess();
    return true;
  }, [handleVerifiedSuccess]);

  useEffect(() => {
    if (!verificationUser?.emailVerified) return;
    handleVerifiedSuccess();
  }, [handleVerifiedSuccess, verificationUser?.emailVerified]);

  useEffect(() => {
    if (!verificationUser) return;

    const interval = setInterval(async () => {
      try {
        await checkVerificationStatus();
      } catch {
        // Ignorar errores de red durante el polling.
      }
    }, 4000);

    const handleWindowFocus = () => {
      void checkVerificationStatus().catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void checkVerificationStatus().catch(() => undefined);
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkVerificationStatus, verificationUser]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!verificationUser) {
      toast.error("Inicia sesion para reenviar el correo.");
      navigate(PUBLIC_ROUTES.login);
      return;
    }

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

  const handlePrimaryAction = async () => {
    if (!verificationUser) {
      navigate(PUBLIC_ROUTES.login);
      return;
    }

    setChecking(true);
    try {
      const verified = await checkVerificationStatus();
      if (!verified) {
        toast.error("Aun no hemos recibido tu confirmacion. Revisa tu correo.");
      }
    } catch {
      toast.error("No se pudo verificar el estado.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="auth-page verify-email-page">
      <div className="auth-card verify-email-card">
        <div className="verify-email-topbar">
          <span className="verify-email-kicker">
            <Sparkles size={14} />
            Activa tu acceso
          </span>
          <span className={`verify-email-status ${verificationUser ? "signed-in" : "signed-out"}`}>
            {verificationUser ? "Acceso bloqueado" : "Sesion cerrada"}
          </span>
        </div>

        <div className="verify-email-hero">
          <div className="verify-email-icon-shell">
            <div className="verify-email-icon-ring">
              <MailCheck size={40} strokeWidth={1.8} color="var(--gold-dark)" />
            </div>
          </div>

          <div className="verify-email-copy">
            <h1 className="auth-title verify-email-title">Verifica tu correo</h1>
            <p className="verify-email-lead">
              Enviamos un enlace de confirmacion a esta direccion. Apenas lo abras,
              tu cuenta quedara lista para entrar.
            </p>
            <div className="verify-email-pill" title={pendingEmail}>
              {pendingEmail}
            </div>
          </div>
        </div>

        <div className="verify-email-instructions">
          <div className="verify-email-step">
            <ShieldCheck size={16} />
            <span>Busca el correo en tu bandeja principal o en spam.</span>
          </div>
          <div className="verify-email-step">
            <RefreshCw size={16} />
            <span>Despues de confirmar, vuelve aqui para validar el acceso.</span>
          </div>
          <div className="verify-email-step">
            <Clock3 size={16} />
            <span>Si no lo ves, puedes reenviarlo desde este panel.</span>
          </div>
        </div>

        <div className="verify-email-note">
          {verificationUser
            ? "Tu acceso seguira bloqueado hasta que el correo quede verificado."
            : "Tu sesion quedo cerrada hasta que confirmes el correo."}
        </div>

        <div className="verify-email-actions">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={checking}
            className="btn-primary btn-full verify-email-primary"
          >
            {checking
              ? "Verificando..."
              : verificationUser
                ? <><RefreshCw size={15} />Ya confirme mi correo</>
                : <><LogIn size={15} />Ya confirme, iniciar sesion</>}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="verify-email-secondary"
          >
            {resending
              ? "Enviando correo..."
              : cooldown > 0
                ? `Reenviar disponible en ${cooldown}s`
                : "Reenviar correo de confirmacion"}
          </button>
        </div>

        <div className="verify-email-footer">
          <button
            type="button"
            className="verify-email-back"
            onClick={() => navigate(PUBLIC_ROUTES.login)}
          >
            <LogIn size={14} />
            Volver al inicio de sesion
          </button>
        </div>
      </div>
    </main>
  );
}

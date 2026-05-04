import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IdCard, Mail, Phone, Save, Shield, Trash2, User } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { deleteOwnAccount } from "@/domains/usuarios/services/auth";
import { updateUserProfile } from "@/domains/usuarios/services/users";
import type { UserRole } from "@/types";
import { clearPendingVerificationEmail } from "@/utils/pendingVerification";
import { formatPeruPhone, isValidPeruPhone, normalizePeruPhoneInput, peruPhoneError } from "@/utils/phone";
import { profileSaveErrorToast } from "@/domains/usuarios/utils/profileSaveErrors";

function splitFallbackName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return { nombres: name, apellidos: "" };
  return {
    nombres: parts.slice(0, -2).join(" "),
    apellidos: parts.slice(-2).join(" "),
  };
}

function roleLabel(role?: UserRole) {
  const labels: Record<UserRole, string> = {
    admin: "Administrador",
    cliente: "Cliente",
    trabajador: "Trabajador",
  };
  return labels[role ?? "cliente"];
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const fallback = splitFallbackName(userProfile?.nombre);

  const nombres = userProfile?.nombres ?? fallback.nombres;
  const apellidos = userProfile?.apellidos ?? fallback.apellidos;
  const [telefono, setTelefono] = useState(userProfile?.telefono ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const role = userProfile?.rol ?? "cliente";

  if (!user) return <Navigate to="/login?redirect=/perfil" replace />;

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();

    if (telefono.trim()) {
      const phoneError = peruPhoneError(telefono);
      if (phoneError || !isValidPeruPhone(telefono)) {
        toast.error(phoneError ?? "Ingresa un telefono valido");
        return;
      }
    }

    setSaving(true);
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), 10000);
    });

    try {
      await Promise.race([
        updateUserProfile(user.uid, {
          telefono: telefono.trim() ? formatPeruPhone(telefono) : "",
        }),
        timeout,
      ]);
      await refreshProfile();
      toast.success("Perfil actualizado");
    } catch (err: unknown) {
      toast.error(profileSaveErrorToast(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      clearPendingVerificationEmail();
      toast.success("Tu cuenta fue eliminada");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      const msg = err instanceof Error ? err.message : "";

      if (code.includes("requires-recent-login") || msg === "REQUIRES_RECENT_LOGIN") {
        toast.error("Por seguridad, vuelve a iniciar sesion y luego intenta eliminar la cuenta.");
      } else if (code.includes("too-many-requests")) {
        toast.error("Demasiados intentos. Espera unos minutos.");
      } else if (msg === "NO_USER") {
        toast.error("Tu sesion ya no esta activa");
        navigate("/login", { replace: true });
      } else if (msg === "ACCOUNT_DELETED_WITH_PARTIAL_DATA") {
        toast.success("La cuenta fue eliminada. Algunos datos secundarios se limpiaran despues.");
        navigate("/", { replace: true });
      } else {
        toast.error("No se pudo eliminar la cuenta. Vuelve a intentarlo.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const resetDeleteForm = () => {
    setDeleteOpen(false);
  };

  return (
    <main className="profile-page">
      <h1 className="profile-title">Mi Perfil</h1>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-avatar-area">
            <div className="profile-avatar">
              {userProfile?.nombre?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="profile-name">{userProfile?.nombre}</p>
              <p className="profile-email">{user.email}</p>
              {isAdmin ? (
                <span className="profile-role-badge">
                  <Shield size={12} /> Administrador
                </span>
              ) : (
                <span className={`profile-role-badge ${role}`}>
                  <User size={12} /> {roleLabel(role)}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            <div className="input-group">
              <label>DNI</label>
              <div className="input-wrapper">
                <IdCard size={16} className="input-icon" />
                <input
                  type="text"
                  value={userProfile?.dni ?? ""}
                  disabled
                  className="form-input with-icon"
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
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
                  value={user.email ?? ""}
                  disabled
                  className="form-input with-icon"
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                El correo no se puede cambiar
              </span>
            </div>

            <div className="input-group">
              <label>Telefono</label>
              <div className="input-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(normalizePeruPhoneInput(e.target.value))}
                  className="form-input with-icon"
                  inputMode="tel"
                  maxLength={15}
                  pattern="(?:\\+51\\s?)?9[0-9]{2}\\s?[0-9]{3}\\s?[0-9]{3}"
                  placeholder="+51 999 999 999"
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={16} />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>

          <section className="profile-danger-card profile-danger-section">
            <h2>Zona peligrosa</h2>
            <div className="profile-danger-copy">
              <p>
                Puedes eliminar tu cuenta de forma permanente. Esto cerrara tu sesion y borrara tu
                perfil y tus favoritos.
              </p>
              <p>Tus pedidos previos pueden conservarse por trazabilidad comercial.</p>
            </div>

            <button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} />
              Eliminar cuenta
            </button>
          </section>
        </div>

        <div className="profile-info-card">
          <h2>Informacion de la cuenta</h2>
          <div className="profile-info-rows">
            <div className="profile-info-row">
              <span>Miembro desde</span>
              <span>
                {userProfile?.creadoEn
                  ? new Date(userProfile.creadoEn).toLocaleDateString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </span>
            </div>

            <div className="profile-info-row">
              <span>Rol</span>
              <span style={{ fontWeight: 600, color: isAdmin ? "var(--primary)" : undefined }}>
                {isAdmin ? "Administrador" : roleLabel(role)}
              </span>
            </div>

            <div className="profile-info-row">
              <span>DNI</span>
              <span>{userProfile?.dni ?? "-"}</span>
            </div>

            <div className="profile-info-row">
              <span>UID</span>
              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                {user.uid.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {deleteOpen && (
        <div
          className="profile-delete-modal-overlay"
          onClick={() => {
            if (!deleting) resetDeleteForm();
          }}
        >
          <div className="profile-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-delete-modal-header">
              <div>
                <h2>Confirmar eliminacion</h2>
                <p>Estas seguro de que deseas eliminar tu cuenta de forma permanente?</p>
              </div>
            </div>

            <div className="profile-delete-modal-body">
              <button
                type="button"
                className="btn-danger profile-delete-confirm-btn"
                disabled={deleting}
                onClick={handleDeleteAccount}
              >
                <Trash2 size={16} />
                {deleting ? "Eliminando..." : "Confirmar eliminacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { IdCard, User, Mail, Phone, Save, Shield } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { updateUserProfile } from "@/domains/usuarios/services/users";
import { formatPeruPhone, isValidPeruPhone, normalizePeruPhoneInput, peruPhoneError } from "@/utils/phone";
import toast from "react-hot-toast";
import type { UserRole } from "@/types";

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
    usuario: "Usuario",
  };
  return labels[role ?? "usuario"];
}

export default function ProfilePage() {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const fallback = splitFallbackName(userProfile?.nombre);

  const nombres = userProfile?.nombres ?? fallback.nombres;
  const apellidos = userProfile?.apellidos ?? fallback.apellidos;
  const [telefono, setTelefono] = useState(userProfile?.telefono ?? "");
  const [saving, setSaving] = useState(false);
  const role = userProfile?.rol ?? "usuario";

  if (!user) return <Navigate to="/login?redirect=/perfil" replace />;

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (telefono.trim()) {
      const phoneError = peruPhoneError(telefono);
      if (phoneError || !isValidPeruPhone(telefono)) {
        toast.error(phoneError ?? "Ingresa un teléfono válido");
        return;
      }
    }
    setSaving(true);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 10000)
    );

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
      const msg = err instanceof Error ? err.message : "";
      if (msg === "TIMEOUT") {
        toast.error("Tiempo agotado. Ejecuta: firebase deploy --only firestore:rules");
      } else if (msg.includes("permission-denied") || msg.includes("PERMISSION_DENIED")) {
        toast.error("Sin permisos. Ejecuta: firebase deploy --only firestore:rules");
      } else if (msg.includes("not-found") || msg.includes("NOT_FOUND")) {
        toast.error("Documento no encontrado. Recarga la página e intenta de nuevo");
      } else {
        toast.error(`Error: ${msg || "no se pudo guardar"}`);
      }
    } finally {
      setSaving(false);
    }
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
              <label>Correo electrónico</label>
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
              <label>Teléfono</label>
              <div className="input-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(normalizePeruPhoneInput(e.target.value))}
                  className="form-input with-icon"
                  inputMode="tel"
                  maxLength={15}
                  pattern="(?:\+51\s?)?9[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}"
                  placeholder="+51 999 999 999"
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={16} />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </div>

        <div className="profile-info-card">
          <h2>Información de la cuenta</h2>
          <div className="profile-info-rows">
            <div className="profile-info-row">
              <span>Miembro desde</span>
              <span>
                {userProfile?.creadoEn
                  ? new Date(userProfile.creadoEn).toLocaleDateString("es-PE", {
                      year: "numeric", month: "long", day: "numeric",
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
    </main>
  );
}

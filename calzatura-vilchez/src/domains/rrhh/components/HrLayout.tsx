import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Building2, ClipboardList, LogOut, Store } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { HR_ROUTES, PUBLIC_ROUTES } from "@/routes/paths";
import { logoutUser } from "@/domains/usuarios/services/auth";
import toast from "react-hot-toast";

export default function HrLayout() {
  const { user, userProfile, loading, isAdmin, isRrhh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  if (!isRrhh && !isAdmin) return <Navigate to={PUBLIC_ROUTES.home} replace />;

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate(PUBLIC_ROUTES.home, { replace: true });
      toast.success("Sesión cerrada");
    } catch {
      toast.error("No se pudo cerrar sesión");
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Menú de recursos humanos">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <Building2 size={20} />
            <span className="admin-brand-name">Recursos humanos</span>
          </div>
          <p className="text-sm opacity-80 px-3">{userProfile?.nombre}</p>
        </div>
        <nav className="admin-nav">
          <NavLink to={HR_ROUTES.home} end className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
            <ClipboardList size={18} />
            <span className="admin-nav-label">Seguimientos</span>
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" className="admin-nav-item admin-back-link" onClick={() => navigate(PUBLIC_ROUTES.home)}>
            <Store size={18} />
            <span className="admin-nav-label">Ver tienda</span>
          </button>
          <button type="button" className="admin-nav-item admin-back-link" onClick={handleLogout}>
            <LogOut size={18} />
            <span className="admin-nav-label">Salir</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

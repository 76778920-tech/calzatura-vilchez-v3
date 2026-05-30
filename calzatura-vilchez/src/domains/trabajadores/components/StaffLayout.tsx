import "@/styles/admin.css";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, CircleDollarSign, LogOut, Store, BookOpen, Moon, Sun } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { ADMIN_ROUTES, PUBLIC_ROUTES, STAFF_ROUTES } from "@/routes/paths";
import { logoutUser } from "@/domains/usuarios/services/auth";
import { useThemeMode } from "@/hooks/useThemeMode";
import toast from "react-hot-toast";

export default function StaffLayout() {
  const { user, userProfile, loading, isAdmin, isTrabajador } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeMode();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }
  if (isAdmin) {
    return <Navigate to={ADMIN_ROUTES.dashboard} replace />;
  }
  if (!isTrabajador) {
    return <Navigate to={PUBLIC_ROUTES.home} replace />;
  }

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
      <a href="#staff-main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <aside className="admin-sidebar" aria-label="Menú de tienda">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <Store size={20} />
            <span className="admin-brand-name">
              <strong>Área tienda</strong>
              <small>{userProfile?.nombre?.trim() || "Trabajador"}</small>
            </span>
          </div>
          <button
            type="button"
            className="admin-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <nav className="admin-nav" aria-label="Módulos del panel de tienda">
          <NavLink to={STAFF_ROUTES.home} end className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
            <LayoutDashboard size={18} />
            <span className="admin-nav-label">Inicio</span>
          </NavLink>
          <NavLink to={STAFF_ROUTES.orders} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
            <ShoppingBag size={18} />
            <span className="admin-nav-label">Pedidos</span>
          </NavLink>
          <NavLink to={STAFF_ROUTES.sales} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
            <CircleDollarSign size={18} />
            <span className="admin-nav-label">Ventas</span>
          </NavLink>
          <NavLink to={STAFF_ROUTES.complaints} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
            <BookOpen size={18} />
            <span className="admin-nav-label">Reclamaciones</span>
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-nav-item admin-back-link"
            onClick={() => navigate(PUBLIC_ROUTES.home)}
            title="Ver tienda"
          >
            <Store size={18} />
            <span className="admin-nav-label">Ver tienda</span>
          </button>
          <button
            type="button"
            className="admin-nav-item admin-back-link"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            <span className="admin-nav-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <main className="admin-main" id="staff-main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

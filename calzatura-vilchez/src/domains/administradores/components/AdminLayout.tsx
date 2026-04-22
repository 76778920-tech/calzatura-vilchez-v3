import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, LogOut, CircleDollarSign, Users, Moon, Sun, Factory, Store, Brain } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { ADMIN_ROUTES, PUBLIC_ROUTES } from "@/routes/paths";
import { logoutUser } from "@/domains/usuarios/services/auth";
import { useThemeMode } from "@/hooks/useThemeMode";
import toast from "react-hot-toast";

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
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

  if (!isAdmin) {
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
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <span className="logo-icon">CV</span>
            <span>Admin Panel</span>
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
        <nav className="admin-nav">
          <NavLink
            to={ADMIN_ROUTES.dashboard}
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink
            to={ADMIN_ROUTES.products}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <Package size={18} /> Productos
          </NavLink>
          <NavLink
            to={ADMIN_ROUTES.orders}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <ShoppingBag size={18} /> Pedidos
          </NavLink>
          <NavLink
            to={ADMIN_ROUTES.sales}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <CircleDollarSign size={18} /> Ventas
          </NavLink>
          <NavLink
            to={ADMIN_ROUTES.users}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <Users size={18} /> Usuarios
          </NavLink>
          <NavLink
            to={ADMIN_ROUTES.manufacturers}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <Factory size={18} /> Fabricantes
          </NavLink>
          <NavLink
            to={ADMIN_ROUTES.predictions}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <Brain size={18} /> Predicciones IA
          </NavLink>
        </nav>
        <button
          type="button"
          className="admin-nav-item admin-back-link"
          onClick={() => navigate(PUBLIC_ROUTES.home)}
        >
          <Store size={18} /> Ver tienda
        </button>
        <button type="button" className="admin-nav-item admin-back-link" onClick={handleLogout}>
          <LogOut size={18} /> Cerrar sesión
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

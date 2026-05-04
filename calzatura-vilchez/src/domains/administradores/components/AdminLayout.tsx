import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, LogOut, CircleDollarSign, Users, Moon, Sun, Factory, Store, Brain, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("adminSidebarCollapsed") === "true"
  );

  const mainRef = useRef<HTMLElement | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("adminSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  // Al colapsar, si el foco estaba dentro del sidebar lo mueve al contenido
  // principal para evitar que quede atrapado en un elemento oculto visualmente.
  useEffect(() => {
    if (!collapsed) return;
    const sidebar = document.getElementById("admin-sidebar");
    if (sidebar?.contains(document.activeElement) && mainRef.current) {
      mainRef.current.focus();
    }
  }, [collapsed]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  if (!isAdmin) return <Navigate to={PUBLIC_ROUTES.home} replace />;

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
      <aside id="admin-sidebar" className={`admin-sidebar${collapsed ? " collapsed" : ""}`} aria-label="Menú de administración">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <span className="logo-icon">CV</span>
            <span className="admin-brand-name">Admin Panel</span>
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

        <nav className="admin-nav" aria-label="Módulos del panel">
          <NavLink to={ADMIN_ROUTES.dashboard} end className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Dashboard">
            <LayoutDashboard size={18} /><span className="admin-nav-label">Dashboard</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.products} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Productos">
            <Package size={18} /><span className="admin-nav-label">Productos</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.orders} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Pedidos">
            <ShoppingBag size={18} /><span className="admin-nav-label">Pedidos</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.sales} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Ventas">
            <CircleDollarSign size={18} /><span className="admin-nav-label">Ventas</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.users} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Usuarios">
            <Users size={18} /><span className="admin-nav-label">Usuarios</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.manufacturers} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Fabricantes">
            <Factory size={18} /><span className="admin-nav-label">Fabricantes</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.predictions} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Predicciones IA">
            <Brain size={18} /><span className="admin-nav-label">Predicciones IA</span>
          </NavLink>
          <NavLink to={ADMIN_ROUTES.data} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`} title="Datos Excel">
            <FileSpreadsheet size={18} /><span className="admin-nav-label">Datos Excel</span>
          </NavLink>
        </nav>

        <button type="button" className="admin-nav-item admin-back-link" onClick={() => navigate(PUBLIC_ROUTES.home)} title="Ver tienda">
          <Store size={18} /><span className="admin-nav-label">Ver tienda</span>
        </button>
        <button type="button" className="admin-nav-item admin-back-link" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={18} /><span className="admin-nav-label">Cerrar sesión</span>
        </button>
      </aside>

      {/* Tira de colapso entre sidebar y contenido */}
      <button
        type="button"
        className="admin-sidebar-toggle"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls="admin-sidebar"
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <main ref={mainRef} tabIndex={-1} className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

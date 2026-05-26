import "@/styles/admin.css";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, CircleDollarSign, LogOut, Store } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { ADMIN_ROUTES, PUBLIC_ROUTES, STAFF_ROUTES } from "@/routes/paths";
import { logoutUser } from "@/domains/usuarios/services/auth";
import toast from "react-hot-toast";

export default function StaffLayout() {
  const { user, userProfile, loading, isAdmin, isTrabajador } = useAuth();
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
      <aside className="admin-sidebar" aria-label="Menú de tienda">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <Store size={20} />
            <span className="admin-brand-name">Área tienda</span>
          </div>
          <p className="text-sm opacity-80 px-3">{userProfile?.nombre}</p>
        </div>
        <nav className="admin-nav">
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
        </nav>
        <button type="button" className="admin-nav-item w-full" onClick={handleLogout}>
          <LogOut size={18} />
          <span className="admin-nav-label">Salir</span>
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

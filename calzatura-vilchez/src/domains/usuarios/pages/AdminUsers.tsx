import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { isSuperAdminEmail } from "@/config/security";
import { fetchAllOrders } from "@/domains/pedidos/services/orders";
import { fetchAllUsers, updateUserRole } from "@/domains/usuarios/services/users";
import type { Order, UserProfile, UserRole } from "@/types";

type UserFilter = "todos" | UserRole;

const ROLE_OPTIONS: UserRole[] = ["cliente", "trabajador", "admin"];

function fullName(user: UserProfile) {
  const names = [user.nombres, user.apellidos].filter(Boolean).join(" ").trim();
  return names || user.nombre || "Usuario sin nombre";
}

function normalizeRole(role?: string): UserRole {
  if (role === "admin" || role === "cliente" || role === "trabajador") {
    return role;
  }
  return "cliente";
}

function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    admin: "Administrador",
    cliente: "Cliente",
    trabajador: "Trabajador",
  };
  return labels[role];
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const currentIsSuperAdmin = isSuperAdminEmail(currentUser?.email);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<UserFilter>("todos");
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchAllOrders()])
      .then(([userItems, orderItems]) => {
        setUsers(userItems);
        setOrders(orderItems);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const role = normalizeRole(user.rol);
        acc[role] += 1;
        return acc;
      },
      { admin: 0, cliente: 0, trabajador: 0 }
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const role = normalizeRole(user.rol);
      const orderCount = orders.filter((order) => order.userId === user.uid).length;
      const searchable = [
        fullName(user),
        user.email,
        user.dni,
        user.telefono,
        roleLabel(role),
        String(orderCount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = term === "" || searchable.includes(term);
      const matchesFilter = filter === "todos" || role === filter;
      return matchesSearch && matchesFilter;
    });
  }, [users, orders, searchTerm, filter]);

  const handleRoleChange = async (targetUser: UserProfile, nextRole: UserRole) => {
    const currentRole = normalizeRole(targetUser.rol);
    if (currentRole === nextRole) return;
    if (!currentIsSuperAdmin && (currentRole === "admin" || nextRole === "admin")) {
      toast.error("Solo el superadministrador puede gestionar roles de administrador");
      return;
    }

    setSavingRoleId(targetUser.uid);
    try {
      await updateUserRole(targetUser.uid, nextRole);
      setUsers((items) =>
        items.map((item) =>
          item.uid === targetUser.uid ? { ...item, rol: nextRole } : item
        )
      );
      toast.success(`Rol actualizado a ${roleLabel(nextRole)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "");
      const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
      const isPermissionError = code === "42501" || msg.toLowerCase().includes("row-level security");
      if (isPermissionError) {
        toast.error("Sin permisos para realizar esta operación.");
      } else {
        toast.error("No se pudo actualizar el rol");
      }
    } finally {
      setSavingRoleId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-kicker">Perfiles</span>
          <h1 className="admin-page-title">Usuarios registrados</h1>
          <p className="admin-page-subtitle">
            Asigna roles manualmente para controlar quién es cliente,
            trabajador o administrador.
          </p>
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <Users size={22} />
          <div><span>Total usuarios</span><strong>{users.length}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <UserCheck size={22} />
          <div><span>Clientes</span><strong>{stats.cliente}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <BriefcaseBusiness size={22} />
          <div><span>Trabajadores</span><strong>{stats.trabajador}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <ShieldCheck size={22} />
          <div><span>Administradores</span><strong>{stats.admin}</strong></div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrapper">
          <Search size={17} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, DNI, correo, teléfono o rol"
          />
        </div>
        <div className="admin-filter-grid admin-user-filter-grid">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as UserFilter)}
            className="form-input"
          >
            <option value="todos">Todos los perfiles</option>
            <option value="admin">Administradores</option>
            <option value="cliente">Clientes</option>
            <option value="trabajador">Trabajadores</option>

          </select>
        </div>
      </div>

      <div className="admin-table-wrapper product-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Rol</th>
              <th>DNI</th>
              <th>Contacto</th>
              <th>Pedidos</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-empty-cell">
                  No se encontraron usuarios con esos filtros.
                </td>
              </tr>
            )}

            {filteredUsers.map((profile) => {
              const role = normalizeRole(profile.rol);
              const userOrders = orders.filter((order) => order.userId === profile.uid);
              const isProtectedAdmin =
                isSuperAdminEmail(profile.email)
                || profile.uid === currentUser?.uid
                || (role === "admin" && !currentIsSuperAdmin);
              const visibleRoleOptions = currentIsSuperAdmin
                ? ROLE_OPTIONS
                : ROLE_OPTIONS.filter((option) => option !== "admin");

              return (
                <tr key={profile.uid}>
                  <td>
                    <div className="admin-user-cell">
                      <span className="admin-user-avatar">
                        {fullName(profile).slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{fullName(profile)}</strong>
                        <span>{profile.uid.slice(0, 10)}...</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-role-control">
                      <span className={`admin-role-badge ${role}`}>{roleLabel(role)}</span>
                      <select
                        className="form-input admin-role-select"
                        value={role}
                        disabled={savingRoleId === profile.uid || isProtectedAdmin}
                        onChange={(e) => handleRoleChange(profile, e.target.value as UserRole)}
                        title={
                          isProtectedAdmin
                            ? "Este rol está protegido para evitar perder acceso"
                            : "Cambiar rol"
                        }
                      >
                        {visibleRoleOptions.map((option) => (
                          <option key={option} value={option}>
                            {roleLabel(option)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>{profile.dni || "Sin DNI"}</td>
                  <td>
                    <div className="admin-contact-cell">
                      <span><Mail size={13} /> {profile.email}</span>
                      <span><Phone size={13} /> {profile.telefono || "Sin teléfono"}</span>
                    </div>
                  </td>
                  <td>
                    <span className="admin-soft-badge">{userOrders.length}</span>
                  </td>
                  <td>
                    {profile.creadoEn
                      ? new Date(profile.creadoEn).toLocaleDateString("es-PE")
                      : "Sin fecha"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

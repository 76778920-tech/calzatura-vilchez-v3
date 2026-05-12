import { AdminSalesLoadedView } from "./AdminSalesLoadedView";
import { useAdminSalesPage } from "./useAdminSalesPage";

export default function AdminSales() {
  const page = useAdminSalesPage();
  const { loading, ...loaded } = page;
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando ventas...</p>
      </div>
    );
  }
  return <AdminSalesLoadedView {...loaded} />;
}

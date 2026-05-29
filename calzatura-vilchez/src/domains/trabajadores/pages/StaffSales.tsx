import { AdminSalesLoadedView } from "@/domains/ventas/pages/AdminSalesLoadedView";
import { useStaffSalesPage } from "./useStaffSalesPage";

export default function StaffSales() {
  const page = useStaffSalesPage();

  if (page.loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Cargando ventas de tienda...</p>
      </div>
    );
  }

  return <AdminSalesLoadedView {...page} />;
}

import type { SalesPageModel } from "@/domains/ventas/pages/useSalesPage";
import { useSalesPage } from "@/domains/ventas/pages/useSalesPage";

export type StaffSalesPageModel = SalesPageModel;

/** Panel tienda: alcance BFF /staff/* fijo (incluso si el usuario es admin en /staff/ventas). */
export function useStaffSalesPage(): StaffSalesPageModel {
  return useSalesPage({
    financeScope: "staff",
    showFinancialDetails: false,
  });
}

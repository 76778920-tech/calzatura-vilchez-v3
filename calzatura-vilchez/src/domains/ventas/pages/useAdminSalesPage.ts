import type { SalesPageModel } from "./useSalesPage";
import { useSalesPage } from "./useSalesPage";

export type AdminSalesTotalsShape = import("./useSalesPage").SalesTotalsShape;
export type AdminSalesPageModel = SalesPageModel;

/** Panel administrador: solo rutas BFF /admin/* y métricas financieras. */
export function useAdminSalesPage(): AdminSalesPageModel {
  return useSalesPage({
    financeScope: "admin",
    showFinancialDetails: true,
  });
}

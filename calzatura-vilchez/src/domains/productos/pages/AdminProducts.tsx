import { AdminProductsView } from "./AdminProductsView";
import { useAdminProductsPage } from "./useAdminProductsPage";

export default function AdminProducts() {
  return <AdminProductsView {...useAdminProductsPage()} />;
}

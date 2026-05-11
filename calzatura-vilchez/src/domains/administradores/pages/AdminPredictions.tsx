import { AlertTriangle, RefreshCw } from "lucide-react";
import { AdminPredictionsDashboard } from "@/domains/administradores/predictions/AdminPredictionsDashboard";
import { useAdminPredictionsModel } from "@/domains/administradores/predictions/useAdminPredictionsModel";

export default function AdminPredictions() {
  const model = useAdminPredictionsModel();

  if (model.loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Analizando ventas, ingresos e inventario...</p>
      </div>
    );
  }

  if (model.error) {
    return (
      <div className="pred-error-card">
        <AlertTriangle size={32} />
        <h3>No se pudo conectar con el servicio de IA</h3>
        <p>{model.error}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            model.refreshPredictions().catch(() => undefined);
          }}
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  return <AdminPredictionsDashboard {...model} />;
}

import { AlertTriangle, Boxes, PackageCheck, Star } from "lucide-react";

type Stats = {
  bajoStock: number;
  stockTotal: number;
  destacados: number;
};

type Props = {
  productCount: number;
  stats: Stats;
};

export function AdminProductsStatsBar({ productCount, stats }: Props) {
  return (
    <div className="admin-stats-grid product-stats-grid">
      <div className="stat-card admin-metric-card">
        <Boxes size={22} />
        <div>
          <span>Total productos</span>
          <strong>{productCount}</strong>
        </div>
      </div>
      <div className="stat-card admin-metric-card">
        <AlertTriangle size={22} />
        <div>
          <span>Stock bajo</span>
          <strong>{stats.bajoStock}</strong>
        </div>
      </div>
      <div className="stat-card admin-metric-card">
        <PackageCheck size={22} />
        <div>
          <span>Stock total</span>
          <strong>{stats.stockTotal}</strong>
        </div>
      </div>
      <div className="stat-card admin-metric-card">
        <Star size={22} />
        <div>
          <span>Destacados</span>
          <strong>{stats.destacados}</strong>
        </div>
      </div>
    </div>
  );
}

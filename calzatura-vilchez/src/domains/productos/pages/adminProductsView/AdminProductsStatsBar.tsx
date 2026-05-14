import { AlertTriangle, Boxes, GitCompareArrows, PackageCheck, Star } from "lucide-react";

type Stats = {
  bajoStock: number;
  stockTotal: number;
  destacados: number;
  stockTallaIncoherentes: number;
};

type Props = Readonly<{
  productCount: number;
  stats: Stats;
}>;

export function AdminProductsStatsBar({ productCount, stats }: Props) {
  const incClass =
    stats.stockTallaIncoherentes > 0
      ? "stat-card admin-metric-card admin-metric-card--alert"
      : "stat-card admin-metric-card";
  return (
    <div className="admin-stats-grid product-stats-grid">
      <div className="stat-card admin-metric-card">
        <Boxes size={22} />
        <div>
          <span>Total productos</span>
          <strong>{productCount}</strong>
        </div>
      </div>
      <div className={incClass}>
        <GitCompareArrows size={22} />
        <div>
          <span>Stock ≠ suma tallas</span>
          <strong>{stats.stockTallaIncoherentes}</strong>
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

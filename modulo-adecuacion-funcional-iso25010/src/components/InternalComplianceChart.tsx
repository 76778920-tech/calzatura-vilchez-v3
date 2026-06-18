import { formatPct } from "../utils/scale";

export interface ComplianceBar {
  label: string;
  value: number | null;
  level: string;
}

/** Gráfico de barras — cumplimiento interno (CF, COF, TECP) con umbrales 70/80/90. */
export function InternalComplianceChart({
  title,
  items,
  overall,
}: {
  title: string;
  items: ComplianceBar[];
  overall: number | null;
}) {
  const max = 100;
  const chartH = 220;
  const barW = 56;
  const gap = 48;
  const originX = 48;
  const baseY = chartH - 24;
  const scaleH = baseY - 20;

  const thresholds = [
    { pct: 90, label: "90" },
    { pct: 80, label: "80" },
    { pct: 70, label: "70" },
  ];

  return (
    <section className="panel compliance-chart-panel">
      <div className="compliance-chart-head">
        <h2>{title}</h2>
        {overall != null && (
          <div className="overall-pill">
            Promedio interno: <strong>{formatPct(overall)}</strong>
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${originX + items.length * (barW + gap) + 40} ${chartH + 20}`}
        className="compliance-chart-svg"
        role="img"
        aria-label={title}
      >
        {thresholds.map((t) => {
          const y = baseY - (t.pct / max) * scaleH;
          return (
            <g key={t.pct}>
              <line x1={originX - 8} x2={originX + items.length * (barW + gap)} y1={y} y2={y} className="threshold-line" strokeDasharray="4 4" />
              <text x={originX - 12} y={y + 4} textAnchor="end" className="threshold-label">
                {t.label}%
              </text>
            </g>
          );
        })}
        {items.map((item, i) => {
          const v = item.value ?? 0;
          const barH = (v / max) * scaleH;
          const x = originX + i * (barW + gap);
          const y = baseY - barH;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barW} height={barH} rx={6} className={`bar-fill level-${item.level}`} />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="bar-pct-label">
                {formatPct(item.value)}
              </text>
              <text x={x + barW / 2} y={baseY + 16} textAnchor="middle" className="bar-name-label">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="chart-footnote muted">
        Umbrales internos: 90% Excelente · 80% Bueno · 70% Aceptable. Valores leídos del registro actual — no editables manualmente.
      </p>
    </section>
  );
}

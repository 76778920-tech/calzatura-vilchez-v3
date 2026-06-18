/** Gráfico de barras apiladas — valores derivados de datos reales (ok / fail / pending). */
interface Segment {
  label: string;
  value: number;
  tone: "ok" | "fail" | "pending";
}

export function StackedBarChart({ title, segments }: { title: string; segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const w = 360;
  const h = 28;
  let x = 0;
  return (
    <div className="stacked-bar">
      <div className="stacked-bar-header">
        <span>{title}</span>
        <span className="muted">Total: {total}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="stacked-bar-svg" role="img" aria-label={title}>
        {segments.map((seg) => {
          const segW = (seg.value / total) * w;
          const rect = (
            <g key={seg.label}>
              <rect x={x} y={0} width={Math.max(segW, seg.value > 0 ? 2 : 0)} height={h} rx={4} className={`seg-${seg.tone}`} />
              {segW > 36 && (
                <text x={x + segW / 2} y={h / 2 + 4} textAnchor="middle" className="seg-label">
                  {seg.value}
                </text>
              )}
            </g>
          );
          x += segW;
          return rect;
        })}
        <g transform={`translate(0, ${h + 8})`}>
          {segments.map((seg, i) => (
            <g key={seg.label} transform={`translate(${i * 120}, 0)`}>
              <rect width={10} height={10} y={2} className={`seg-${seg.tone}`} rx={2} />
              <text x={14} y={11} className="legend-text">
                {seg.label} ({seg.value})
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

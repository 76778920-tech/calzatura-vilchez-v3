import { formatPct } from "../utils/scale";

interface BarItem {
  label: string;
  value: number | null;
  level: string;
}

export function BarChart({ items, title }: { items: BarItem[]; title: string }) {
  const max = 100;
  return (
    <div className="bar-chart">
      <h3>{title}</h3>
      <svg viewBox={`0 0 400 ${items.length * 48 + 20}`} className="bar-chart-svg" aria-label={title}>
        {items.map((item, i) => {
          const w = item.value == null ? 0 : (item.value / max) * 320;
          const y = 16 + i * 48;
          return (
            <g key={item.label}>
              <text x={0} y={y + 12} className="bar-label">
                {item.label}
              </text>
              <rect x={80} y={y} width={320} height={20} className="bar-track" rx={4} />
              <rect x={80} y={y} width={w} height={20} className={`bar-fill level-${item.level}`} rx={4} />
              <text x={408} y={y + 14} className="bar-value">
                {formatPct(item.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

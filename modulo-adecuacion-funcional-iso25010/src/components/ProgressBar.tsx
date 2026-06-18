import { formatPct } from "../utils/scale";
import type { ClassificationLevel } from "../utils/scale";

interface Props {
  value: number | null;
  label?: string;
  level?: ClassificationLevel | string;
}

export function ProgressBar({ value, label, level = "none" }: Props) {
  const width = value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-header">
          <span>{label}</span>
          <span className="progress-pct">{formatPct(value)}</span>
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progress-fill level-${level}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

import { ProgressBar } from "./ProgressBar";
import { formatPct } from "../utils/scale";

interface Props {
  title: string;
  subtitle: string;
  pct: number | null;
  detail: string;
  classification: { label: string; level: string };
}

export function MetricCard({ title, subtitle, pct, detail, classification }: Props) {
  return (
    <article className={`metric-card level-border-${classification.level}`}>
      <header>
        <h3>{title}</h3>
        <p className="metric-sub">{subtitle}</p>
      </header>
      <div className="metric-value">{formatPct(pct)}</div>
      <span className={`badge level-${classification.level}`}>{classification.label}</span>
      <p className="metric-detail">{detail}</p>
      <ProgressBar value={pct} level={classification.level} />
    </article>
  );
}

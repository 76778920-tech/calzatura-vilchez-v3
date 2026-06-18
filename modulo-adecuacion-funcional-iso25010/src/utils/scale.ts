export type ClassificationLevel = "excellent" | "good" | "acceptable" | "deficient" | "none";

export interface Classification {
  label: string;
  level: ClassificationLevel;
}

export function classifyPercent(value: number | null | undefined): Classification {
  if (value == null || Number.isNaN(value)) return { label: "Sin datos", level: "none" };
  if (value >= 90) return { label: "Excelente", level: "excellent" };
  if (value >= 80) return { label: "Bueno", level: "good" };
  if (value >= 70) return { label: "Aceptable", level: "acceptable" };
  return { label: "Deficiente", level: "deficient" };
}

export function formatPct(value: number | null | undefined): string {
  return value == null ? "N/D" : `${value.toFixed(1)}%`;
}

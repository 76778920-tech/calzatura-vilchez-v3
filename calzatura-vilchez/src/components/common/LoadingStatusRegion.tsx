import type { ReactNode } from "react";

type LoadingStatusRegionProps = Readonly<{
  className?: string;
  label: string;
  children: ReactNode;
}>;

/** Región de carga accesible (Sonar: preferir output frente a role="status"). */
export function LoadingStatusRegion({ className, label, children }: LoadingStatusRegionProps) {
  return (
    <output
      className={className ? `loading-status-region ${className}` : "loading-status-region"}
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      {children}
    </output>
  );
}

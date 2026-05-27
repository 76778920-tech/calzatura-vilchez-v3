import type { AnchorHTMLAttributes, ReactNode } from "react";

type ExternalLinkProps = Readonly<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> & {
    href: string;
    children: ReactNode;
    /** Hide the visual ↗ icon (e.g. for icon-only links that already have aria-label). */
    hideIcon?: boolean;
  }
>;

export function ExternalLink({ children, hideIcon, className, ...rest }: ExternalLinkProps) {
  return (
    <a {...rest} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      {!hideIcon && <span aria-hidden="true" className="external-link-icon"> ↗</span>}
      <span className="sr-only"> (se abre en nueva pestaña)</span>
    </a>
  );
}

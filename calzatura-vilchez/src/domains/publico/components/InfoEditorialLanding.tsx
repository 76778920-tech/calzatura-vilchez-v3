import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type InfoEditorialAction = {
  to: string;
  label: string;
  variant: "primary" | "outline";
};

type Props = Readonly<{
  icon: LucideIcon;
  kicker: string;
  title: string;
  intro: string;
  actions: InfoEditorialAction[];
  footnote?: ReactNode;
}>;

const KICKER_ICON_PROPS = { size: 16, style: { verticalAlign: "text-bottom", marginRight: "0.35rem" } } as const;

export function InfoEditorialLanding({ icon: Icon, kicker, title, intro, actions, footnote }: Props) {
  return (
    <main className="info-page info-page--beneficios">
      <section className="info-page-hero">
        <div className="info-page-accent">
          <p>
            <Icon {...KICKER_ICON_PROPS} aria-hidden />
            {kicker}
          </p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>
      <div className="info-page-actions">
        {actions.map((action) => (
          <Link
            key={`${action.to}-${action.label}`}
            to={action.to}
            className={action.variant === "primary" ? "btn-primary" : "btn-outline"}
          >
            {action.label}
          </Link>
        ))}
      </div>
      {footnote}
    </main>
  );
}

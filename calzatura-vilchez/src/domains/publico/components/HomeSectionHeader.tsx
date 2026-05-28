import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type Props = Readonly<{
  eyebrow: string;
  title: string;
  linkTo: string;
  linkLabel: string;
  className?: string;
}>;

export function HomeSectionHeader({ eyebrow, title, linkTo, linkLabel, className = "section-header" }: Props) {
  return (
    <div className={className}>
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      <Link to={linkTo} className="section-link">
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

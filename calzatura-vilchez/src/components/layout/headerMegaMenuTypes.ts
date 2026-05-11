export type MegaLink = {
  label: string;
  to: string;
  tag?: string;
  accent?: boolean;
  image?: string;
  hoverPanel?: {
    eyebrow: string;
    items: MegaLink[];
    layout?: "grid" | "list";
  };
};

export type MegaMenu = {
  id: string;
  label: string;
  columns: { title?: string; links: MegaLink[] }[];
  featured?: MegaLink[];
  chips?: { title: string; items: MegaLink[] };
  promo?: { eyebrow: string; title: string; subtitle: string; to?: string };
};

export type MobileMenuMode = "click" | "hover" | null;

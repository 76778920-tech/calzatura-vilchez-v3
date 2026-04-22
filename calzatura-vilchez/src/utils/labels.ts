const CATEGORY_LABELS: Record<string, string> = {
  todos: "Todos",
  hombre: "Hombre",
  mujer: "Dama",
  dama: "Dama",
  juvenil: "Juvenil",
  nino: "Niños",
  bebe: "Bebé",
  deportivo: "Deportivo",
  casual: "Casual",
  formal: "Formal",
  "cyver-wiw": "CYVER WIW",
};

export function categoryLabel(slug: string) {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

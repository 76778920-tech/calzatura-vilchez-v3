const CATEGORY_LABELS: Record<string, string> = {
  todos: "Todos",
  hombre: "Hombre",
  mujer: "Mujer",
  dama: "Mujer",
  juvenil: "Juvenil",
  nino: "Niños",
  ninos: "Niños",
  ninas: "Niñas",
  bebe: "Bebé",
  junior: "Junior",
  deportivo: "Deportivo",
  casual: "Casual",
  formal: "Formal",
  "cyber-wow": "CYBER WOW",
};

export function categoryLabel(slug: string) {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

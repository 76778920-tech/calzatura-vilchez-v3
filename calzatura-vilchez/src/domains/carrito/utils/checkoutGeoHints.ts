const GEO_LAYER_HINT: Partial<Record<string, string>> = {
  address: "Dirección (calle y número)",
  street: "Calle",
  venue: "Lugar / negocio",
  neighbourhood: "Barrio",
  borough: "Distrito o zona",
  locality: "Ciudad (poco preciso)",
  localadmin: "Zona administrativa",
  region: "Región",
};

export function checkoutGeoLayerHint(layer?: string): string | null {
  if (!layer) return null;
  return GEO_LAYER_HINT[layer] ?? null;
}

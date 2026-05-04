export function capitalizeWords(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)([a-záéíóúñ])/g, (_, space: string, letter: string) =>
      `${space}${letter.toUpperCase()}`
    );
}

export function parseColorList(value = "") {
  const unique = new Map<string, string>();

  value
    .split(",")
    .map(capitalizeWords)
    .filter(Boolean)
    .forEach((color) => {
      unique.set(color.toLowerCase(), color);
    });

  return Array.from(unique.values()).slice(0, 5);
}

export function getProductColors(product: { color?: string }) {
  const c = capitalizeWords(product.color ?? "");
  return c ? [c] : [];
}

export function formatColors(colors: string[]) {
  return colors.join(", ");
}

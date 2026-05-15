/**
 * En build de producción las URLs públicas del bundle deben ser https://.
 * En desarrollo se permite http:// (p. ej. localhost).
 *
 * @param isProd — solo para tests; por defecto usa `import.meta.env.PROD`.
 */
export function assertHttpsInProduction(
  url: string,
  envLabel: string,
  isProd: boolean = import.meta.env.PROD,
): string {
  const u = url.trim().replace(/\/$/, "");
  if (!u) return "";
  if (isProd && u.startsWith("http://")) {
    throw new Error(`${envLabel} debe usar https:// en producción.`);
  }
  return u;
}

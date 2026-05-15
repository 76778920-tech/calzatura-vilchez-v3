/**
 * En build de producción las URLs públicas del bundle deben ser https://.
 * En desarrollo se permite http:// (p. ej. localhost).
 */
export function assertHttpsInProduction(url: string, envLabel: string): string {
  const u = url.trim().replace(/\/$/, "");
  if (!u) return "";
  if (import.meta.env.PROD && u.startsWith("http://")) {
    throw new Error(`${envLabel} debe usar https:// en producción.`);
  }
  return u;
}

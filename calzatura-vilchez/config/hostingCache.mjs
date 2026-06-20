/** Cabeceras Cache-Control — alineadas a OWASP ZAP (10049) sin no-store global. */
export const CACHE = {
  /** HTML / SPA shell: revalidar, solo caché privada del navegador. */
  html: "no-cache, must-revalidate, private",
  /** JS/CSS con hash en /assets: caché larga, no compartida en proxies. */
  hashedAssets: "private, max-age=31536000, immutable",
  /** Estáticos públicos (favicon, robots, sitemap, guard). */
  publicStatic: "public, max-age=86400, immutable",
  /** robots/sitemap: revalidación horaria. */
  crawlFiles: "public, max-age=3600",
};

export const CACHE_HEADER_RULES = [
  { source: "/assets/**", value: CACHE.hashedAssets },
  { source: "/favicon.svg", value: CACHE.publicStatic },
  { source: "/robots.txt", value: CACHE.crawlFiles },
  { source: "/sitemap.xml", value: CACHE.crawlFiles },
  { source: "/benign-console-guard.js", value: CACHE.publicStatic },
  { source: "/index.html", value: CACHE.html },
  { source: "/", value: CACHE.html },
];

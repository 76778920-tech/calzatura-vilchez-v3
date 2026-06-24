import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOSTING_CSP } from "../../config/hostingCsp.mjs";

const hostingConfig = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "firebase.json"), "utf8"),
);
const globalHeaders =
  hostingConfig.hosting?.headers?.find((h) => h.source === "**")?.headers ?? [];

function headerValue(key) {
  return globalHeaders.find((h) => h.key === key)?.value ?? "";
}

function directive(name, csp) {
  const re = new RegExp(String.raw`${name}\s+([^;]+)`, "i");
  return re.exec(csp)?.[1]?.trim() ?? "";
}

describe("Seguridad — headers Firebase Hosting (ISO 25010 superficie web)", () => {
  it("HSTS con includeSubDomains", () => {
    expect(headerValue("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headerValue("Strict-Transport-Security")).toContain("includeSubDomains");
  });

  it("anti-clickjacking y nosniff", () => {
    expect(headerValue("X-Frame-Options")).toBe("DENY");
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
  });

  it("CSP alineada a ZAP: sin wildcard img-src, sin report-uri, sin unsafe-inline en style-src", () => {
    const csp = headerValue("Content-Security-Policy");
    expect(csp).toBe(HOSTING_CSP);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("report-to csp-endpoint");
    expect(csp).not.toContain("report-uri");
    expect(csp).not.toMatch(/img-src[^;]*\bhttps:\s/);
    expect(csp).not.toMatch(/img-src[^;]*\bhttps:\s*;/);
    expect(directive("style-src", csp)).not.toContain("unsafe-inline");
    expect(directive("style-src-elem", csp)).not.toContain("unsafe-inline");
    expect(directive("style-src-attr", csp)).toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("style-src-elem tiene 17 hashes de Goober CSS-in-JS sin unsafe-inline", () => {
    const csp = headerValue("Content-Security-Policy");
    const styleSrcElem = directive("style-src-elem", csp);
    expect(styleSrcElem).not.toContain("'unsafe-inline'");
    // Estados base — inicialización del módulo react-hot-toast
    expect(styleSrcElem).toContain("'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg='");
    expect(styleSrcElem).toContain("'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws='");
    expect(styleSrcElem).toContain("'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8='");
    expect(styleSrcElem).toContain("'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU='");
    expect(styleSrcElem).toContain("'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ='");
    expect(styleSrcElem).toContain("'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo='");
    expect(styleSrcElem).toContain("'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y='");
    expect(styleSrcElem).toContain("'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po='");
    expect(styleSrcElem).toContain("'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI='");
    // Estados de iconos — generados al renderizar cada tipo de toast por 1ª vez
    expect(styleSrcElem).toContain("'sha256-D6zmPl9SPOA5yA8xbXKrLL0cVKn8FB4+jrOuJzlq4sI='");
    expect(styleSrcElem).toContain("'sha256-RMLuAlXIwRu2+YnnDVl5tzQPV2YlmPqSWSKEwJidCyc='");
    expect(styleSrcElem).toContain("'sha256-J0fb1cj+TvfbuwoWFcBRWXfZjjxyNBgv9RziegQUbxk='");
    expect(styleSrcElem).toContain("'sha256-+h218lrS+a9xO+7drwOfWjgpuVq/J66Fi1VVl/fnmSY='");
    expect(styleSrcElem).toContain("'sha256-iO7F2hy476ppWnd4pn3N47Ghu4N5JTJ6HwMLvn+hsuo='");
    expect(styleSrcElem).toContain("'sha256-S0YC/uXDAItX6fZw7W0jini2nSubFplw0SLxwxT5MIA='");
    expect(styleSrcElem).toContain("'sha256-v/fQgvryHaSv77dkuEjcOylQzivjwDiVAzXKGxCIvDI='");
    expect(styleSrcElem).toContain("'sha256-gfpYVzW3lrSTqeJ+RZgdXX7GR7soyXFfOjCLj+57t6U='");
  });

  it("COOP same-origin (email auth + Stripe redirect; sin OAuth popup)", () => {
    expect(headerValue("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("Cache-Control: HTML no-store; assets públicos inmutables (ZAP 10049/10015)", () => {
    const globalCache = headerValue("Cache-Control");
    expect(globalCache).toContain("no-store");
    expect(globalCache).toContain("private");

    const assets = hostingConfig.hosting?.headers?.find((h) => h.source === "/assets/**");
    expect(assets?.headers?.find((h) => h.key === "Cache-Control")?.value).toBe(
      "public, max-age=31536000, immutable",
    );
    const sitemap = hostingConfig.hosting?.headers?.find((h) => h.source === "/sitemap.xml");
    expect(sitemap?.headers?.find((h) => h.key === "Cache-Control")?.value).toBe(
      "public, max-age=3600, immutable",
    );
  });
});

/**
 * Guards de interoperabilidad — endpoints BFF y proveedores externos.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const bffDir = path.resolve(process.cwd(), "bff");
const serverSource = fs.readFileSync(path.join(bffDir, "server.cjs"), "utf8");
const deliverySource = fs.readFileSync(path.join(bffDir, "delivery.cjs"), "utf8");
const catalogCacheSource = fs.readFileSync(path.join(bffDir, "catalogCache.cjs"), "utf8");
const publicCatalogSource = fs.readFileSync(path.join(bffDir, "publicCatalog.cjs"), "utf8");

describe("Interoperabilidad BFF — contratos de integración", () => {
  it("expone endpoints de entrega para checkout (geocode, ruta, cotización)", () => {
    expect(serverSource).toContain('app.get("/delivery/geocode"');
    expect(serverSource).toContain('app.get("/delivery/reverse"');
    expect(serverSource).toContain('app.get("/delivery/route"');
    expect(serverSource).toContain('app.get("/delivery/distance"');
    expect(serverSource).toContain('app.get("/delivery/quote"');
    expect(deliverySource).toContain("api.openrouteservice.org");
    expect(deliverySource).toContain("nominatim.openstreetmap.org");
    expect(deliverySource).toContain("maps.googleapis.com/maps/api/directions");
  });

  it("integra Stripe vía createCheckoutSession en el BFF", () => {
    expect(serverSource).toContain('app.post("/createCheckoutSession"');
    expect(serverSource).toContain("stripe.checkout.sessions.create");
    expect(serverSource).toContain("STRIPE_SECRET_KEY");
  });

  it("integra pedidos y catálogo público vía Supabase service role en BFF", () => {
    expect(serverSource).toContain('app.post("/createOrder"');
    expect(serverSource).toContain("createClient");
    expect(publicCatalogSource).toContain("withCatalogCache");
    expect(publicCatalogSource).toContain("from(\"productos\")");
  });

  it("integra lookup DNI y firma Cloudinary para admin", () => {
    expect(serverSource).toContain('app.post("/lookup-dni"');
    expect(serverSource).toContain("handleLookupDni");
    expect(serverSource).toContain('app.post("/admin/media/cloudinary-signature"');
    expect(serverSource).toContain("buildCloudinaryUploadSignature");
  });

  it("usa Upstash para caché de catálogo público con invalidación por generación", () => {
    expect(catalogCacheSource).toContain('require("./upstashRest.cjs")');
    expect(catalogCacheSource).toContain("bumpPublicCatalogCache");
    expect(catalogCacheSource).toContain("PUBLIC_CATALOG_CACHE_TTL_SEC");
    expect(serverSource).toContain("bumpPublicCatalogCache");
  });

  it("verifica Firebase ID token antes de rutas autenticadas del BFF", () => {
    expect(serverSource).toContain("verifyIdToken");
    expect(serverSource).toContain("decodedToken");
  });
});

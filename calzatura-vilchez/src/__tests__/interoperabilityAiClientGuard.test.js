import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const aiClientSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/aiAdminClient.ts"),
  "utf8",
);
const viteConfigSource = fs.readFileSync(path.resolve(process.cwd(), "vite.config.ts"), "utf8");
const apiDocSource = fs.readFileSync(
  path.resolve(process.cwd(), "docs/04-api/api-referencia.md"),
  "utf8",
);
const envExampleSource = fs.readFileSync(path.resolve(process.cwd(), ".env.example"), "utf8");

/** Lista blanca PROXY_ROUTES — debe coincidir con aiAdminClient.ts y api-referencia §2.0 */
const EXPECTED_IA_ROUTES = [
  "/api/predict/combined",
  "/api/sales/weekly-chart",
  "/api/model/metrics",
  "/api/ire/historial",
  "/api/cache/invalidate",
  "/api/campaign/active",
  "/api/campaign/feedback",
  "/api/predict/campaign-detection",
  "/api/campaign/learning-stats",
];

describe("Intercambiabilidad — cliente admin servicio IA", () => {
  it("VITE_AI_SERVICE_URL configurable en cliente y plantilla .env", () => {
    expect(aiClientSource).toContain("VITE_AI_SERVICE_URL");
    expect(aiClientSource).toContain("VITE_AI_ADMIN_PROXY_URL");
    expect(envExampleSource).toContain("VITE_AI_SERVICE_URL");
    expect(envExampleSource).toContain("VITE_AI_ADMIN_PROXY_URL");
  });

  it("lista blanca PROXY_ROUTES cubre endpoints del servicio IA", () => {
    for (const route of EXPECTED_IA_ROUTES) {
      expect(aiClientSource).toContain(`"${route}"`);
    }
  });

  it("api-referencia §2.0 documenta las mismas rutas HTTP", () => {
    expect(apiDocSource).toContain("### 2.0 Contrato HTTP del cliente admin");
    for (const route of EXPECTED_IA_ROUTES) {
      expect(apiDocSource).toContain(route);
    }
  });

  it("api-referencia documenta rebuild, Android AI_SERVICE_URL y compatibilidad Supabase", () => {
    expect(apiDocSource).toContain("AI_SERVICE_URL");
    expect(apiDocSource).toContain("rebuild APK");
    expect(apiDocSource).toContain("Supabase");
    expect(apiDocSource).toMatch(/JSON/i);
  });

  it("autentica con Firebase ID token (no bearer en bundle)", () => {
    expect(aiClientSource).toContain("getIdToken()");
    expect(aiClientSource).toContain("Authorization");
    expect(aiClientSource).not.toMatch(/import\.meta\.env\.VITE_AI_SERVICE_BEARER_TOKEN/);
    expect(viteConfigSource).toContain("VITE_AI_SERVICE_BEARER_TOKEN");
    expect(viteConfigSource).toContain("no debe existir en builds frontend");
  });

  it("expone warm-up de salud del servicio IA", () => {
    expect(aiClientSource).toContain("/api/health");
    expect(aiClientSource).toContain("wakeAIService");
  });
});

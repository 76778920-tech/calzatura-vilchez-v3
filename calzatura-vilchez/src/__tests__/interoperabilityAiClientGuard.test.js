import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const aiClientSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/aiAdminClient.ts"),
  "utf8",
);
const viteConfigSource = fs.readFileSync(path.resolve(process.cwd(), "vite.config.ts"), "utf8");

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

describe("Interoperabilidad — cliente admin servicio IA", () => {
  it("lista blanca PROXY_ROUTES cubre endpoints documentados del servicio IA", () => {
    for (const route of EXPECTED_IA_ROUTES) {
      expect(aiClientSource).toContain(`"${route}"`);
    }
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

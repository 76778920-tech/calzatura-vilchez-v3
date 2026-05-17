import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // `html` genera `playwright-report/index.html` (navegable; útil en artifact de CI).
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    // Estado de auth admin pre-generado (fake user en localStorage).
    // Válido indefinidamente: expirationTime=9999999999999 y los endpoints
    // de Firebase están moquead en los tests de admin.
    storageState: "e2e/.auth/admin.json",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // VITE_E2E=true activa browserLocalPersistence en Firebase, de modo
    // que admin.json (localStorage) sea leído en lugar del IndexedDB.
    env: {
      VITE_E2E: "true",
      // BFF mockeado vía page.route; evita llamadas reales a Render en CI.
      VITE_BACKEND_API_URL: "http://127.0.0.1:5173",
      // E2E mockea las rutas directas del servicio IA. Evita heredar el proxy
      // real desde GitHub Actions, porque eso salta los page.route("**/api/**").
      VITE_AI_ADMIN_PROXY_URL: "",
    },
  },
});

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
    env: { VITE_E2E: "true" },
  },
});

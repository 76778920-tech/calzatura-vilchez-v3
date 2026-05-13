import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/playwright-report/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/domains/**/utils/*.ts",
        "src/domains/**/services/*.ts",
        "src/utils/*.ts",
        "src/security/*.ts",
      ],
      exclude: ["src/**/*.test.*", "src/__tests__/**"],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 45,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});

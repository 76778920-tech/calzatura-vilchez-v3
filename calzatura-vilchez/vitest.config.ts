import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/domains/**/utils/*.ts",
        "src/domains/**/services/*.ts",
      ],
      exclude: ["src/**/*.test.*", "src/__tests__/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});

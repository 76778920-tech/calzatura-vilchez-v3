/**
 * Compila shared/*.ts → shared/*.cjs para el BFF (Node require).
 * El frontend importa los .ts directamente vía Vite.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const esbuild = require("esbuild");
const shared = path.join(root, "shared");

await esbuild.build({
  entryPoints: [
    path.join(shared, "catalogMatch.ts"),
    path.join(shared, "catalogPublicFilter.ts"),
  ],
  bundle: false,
  platform: "node",
  format: "cjs",
  outdir: shared,
  outExtension: { ".js": ".cjs" },
  logLevel: "info",
});

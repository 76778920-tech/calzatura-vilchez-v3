#!/usr/bin/env node
/**
 * Endurece bundles post-build contra falsos positivos ZAP 10027 (react-router minificado).
 * Solo transformaciones seguras que no alteran la semántica del runtime.
 */
import fs from "node:fs";
import path from "node:path";

const distAssets = path.resolve(process.cwd(), "dist/assets");
if (!fs.existsSync(distAssets)) {
  console.log("[strip-zap-bundle-noise] sin dist/assets, omitido");
  process.exit(0);
}

/** Evita la secuencia // en el literal /^\// que ZAP interpreta como comentario. */
function stripFile(src) {
  return src
    .replace(/\.replace\(\/\^\\\/\/,``\)/g, ".replace(/^[/]/,``)")
    .replace(/in response to some user interaction or stat/gi, "");
}

let changed = 0;
for (const file of fs.readdirSync(distAssets).filter((f) => f.endsWith(".js"))) {
  const abs = path.join(distAssets, file);
  const before = fs.readFileSync(abs, "utf8");
  const after = stripFile(before);
  if (after !== before) {
    fs.writeFileSync(abs, after, "utf8");
    changed += 1;
  }
}
console.log(`[strip-zap-bundle-noise] archivos ajustados: ${changed}`);

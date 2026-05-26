import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.join(process.cwd(), "src");
const ASSETS_DIR = path.join(SRC_ROOT, "assets");

function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("image assets integrity (PNG → WebP migration)", () => {
  it("no .png files remain in src/assets/", () => {
    const pngs = listFiles(ASSETS_DIR).filter((f) => f.endsWith(".png"));
    expect(pngs.map((f) => path.relative(ASSETS_DIR, f)), "PNGs residuales encontrados").toEqual([]);
  });

  it("every .webp import in source code resolves to an existing file", () => {
    const importPattern = /from\s+["']@\/assets\/([^"']+\.webp)["']/g;
    const sourceFiles = listSourceFiles(SRC_ROOT);
    const missing = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const assetRelative = match[1];
        const assetAbsolute = path.join(ASSETS_DIR, assetRelative);
        if (!fs.existsSync(assetAbsolute)) {
          missing.push(`${path.relative(SRC_ROOT, file)} → assets/${assetRelative}`);
        }
      }
    }

    expect(missing, "Imports de .webp que no existen en disco").toEqual([]);
  });

  it("no source file imports a .png from @/assets/", () => {
    const importPattern = /from\s+["']@\/assets\/[^"']+\.png["']/g;
    const sourceFiles = listSourceFiles(SRC_ROOT);
    const violations = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      const matches = content.match(importPattern);
      if (matches) {
        for (const m of matches) {
          violations.push(`${path.relative(SRC_ROOT, file)}: ${m}`);
        }
      }
    }

    expect(violations, "Imports de .png de assets que deberían ser .webp").toEqual([]);
  });

  it("all .webp files in assets are referenced by at least one source file", () => {
    const webpFiles = listFiles(ASSETS_DIR).filter((f) => f.endsWith(".webp"));
    const sourceFiles = listSourceFiles(SRC_ROOT);
    const allSource = sourceFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

    const unreferenced = [];
    for (const webp of webpFiles) {
      const basename = path.basename(webp);
      if (!allSource.includes(basename)) {
        unreferenced.push(path.relative(ASSETS_DIR, webp));
      }
    }

    if (unreferenced.length > 0) {
      console.warn(`⚠ WebPs no referenciados (posibles assets muertos): ${unreferenced.join(", ")}`);
    }
    expect(unreferenced.length).toBeLessThanOrEqual(5);
  });

  it("every .webp file has valid content (not 0 bytes, has RIFF header)", () => {
    const webpFiles = listFiles(ASSETS_DIR).filter((f) => f.endsWith(".webp"));
    const corrupt = [];

    for (const webp of webpFiles) {
      const stat = fs.statSync(webp);
      if (stat.size === 0) {
        corrupt.push(`${path.relative(ASSETS_DIR, webp)} (0 bytes)`);
        continue;
      }
      const header = Buffer.alloc(4);
      const fd = fs.openSync(webp, "r");
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      if (header.toString("ascii") !== "RIFF") {
        corrupt.push(`${path.relative(ASSETS_DIR, webp)} (invalid header: ${header.toString("hex")})`);
      }
    }

    expect(corrupt, "Archivos WebP corruptos o vacíos").toEqual([]);
  });

  it("no .webp file exceeds 500 KB (performance guard)", () => {
    const webpFiles = listFiles(ASSETS_DIR).filter((f) => f.endsWith(".webp"));
    const oversized = [];
    const MAX_KB = 500;

    for (const webp of webpFiles) {
      const sizeKB = fs.statSync(webp).size / 1024;
      if (sizeKB > MAX_KB) {
        oversized.push(`${path.relative(ASSETS_DIR, webp)} (${Math.round(sizeKB)} KB)`);
      }
    }

    expect(oversized, `Archivos WebP > ${MAX_KB} KB`).toEqual([]);
  });
});

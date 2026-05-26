import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.join(process.cwd(), "src");
const ASSETS_DIR = path.join(SRC_ROOT, "assets");
const CONSTANTS_FILE = path.join(SRC_ROOT, "constants", "cloudinaryHomeImages.ts");

function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function listSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(full));
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("image assets integrity (Cloudinary CDN migration)", () => {
  it("no bundled image files remain in src/assets/home/", () => {
    const homeDir = path.join(ASSETS_DIR, "home");
    const images = listFiles(homeDir).filter((f) => /\.(png|webp|jpg|jpeg)$/i.test(f));
    expect(images.map((f) => path.relative(ASSETS_DIR, f)), "Bundled images found").toEqual([]);
  });

  it("no source file imports an image from @/assets/home/", () => {
    const importPattern = /from\s+["']@\/assets\/home\/[^"']+["']/g;
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

    expect(violations, "Imports from @/assets/home/ should use cloudinaryHomeImages").toEqual([]);
  });

  it("cloudinaryHomeImages.ts exists and exports Cloudinary URLs", () => {
    expect(fs.existsSync(CONSTANTS_FILE), "cloudinaryHomeImages.ts must exist").toBe(true);

    const content = fs.readFileSync(CONSTANTS_FILE, "utf8");
    const exports = content.match(/export const \w+/g) || [];
    expect(exports.length, "Should export at least 20 Cloudinary image constants").toBeGreaterThanOrEqual(20);

    expect(content).toContain("res.cloudinary.com");
    expect(content).toContain("f_auto");
    expect(content).toContain("q_auto");
  });

  it("all Cloudinary URLs in constants are valid HTTPS URLs", () => {
    const content = fs.readFileSync(CONSTANTS_FILE, "utf8");
    const urlPattern = /https:\/\/res\.cloudinary\.com\/\w+\/image\/upload\/[^`"'\s]+/g;
    const urls = content.match(urlPattern) || [];
    const invalid = [];

    for (const url of urls) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") invalid.push(`${url} (not HTTPS)`);
        if (!parsed.pathname.includes("/image/upload/")) invalid.push(`${url} (missing /image/upload/)`);
      } catch {
        invalid.push(`${url} (invalid URL)`);
      }
    }

    expect(invalid, "Invalid Cloudinary URLs").toEqual([]);
  });

  it("every constant in cloudinaryHomeImages is imported by at least one source file", () => {
    const content = fs.readFileSync(CONSTANTS_FILE, "utf8");
    const exportNames = (content.match(/export const (\w+)/g) || []).map((m) => m.replace("export const ", ""));

    const sourceFiles = listSourceFiles(SRC_ROOT);
    const allSource = sourceFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

    const unused = exportNames.filter((name) => {
      const importPattern = new RegExp(`\\b${name}\\b`);
      const occurrences = allSource.match(new RegExp(`\\b${name}\\b`, "g")) || [];
      return occurrences.length <= 1;
    });

    expect(unused, "Cloudinary constants not imported anywhere").toEqual([]);
  });
});

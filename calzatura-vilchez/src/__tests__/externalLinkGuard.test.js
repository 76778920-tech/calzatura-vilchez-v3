import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");

function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { listFiles(full, acc); continue; }
    acc.push(full);
  }
  return acc;
}

const EXTERNAL_LINK_FILE = path.join(SRC, "components", "common", "ExternalLink.tsx");

describe("ExternalLink guard (WCAG 3.2.5)", () => {
  it("ningún archivo usa target=\"_blank\" fuera de ExternalLink.tsx", () => {
    const offenders = [];

    for (const file of listFiles(SRC)) {
      if (!/\.(tsx|ts|jsx|js)$/.test(file)) continue;
      if (file.includes("__tests__")) continue;
      if (path.resolve(file) === path.resolve(EXTERNAL_LINK_FILE)) continue;

      const content = fs.readFileSync(file, "utf8");
      if (/target=["']_blank["']/.test(content)) {
        offenders.push(path.relative(SRC, file));
      }
    }

    expect(
      offenders,
      `Estos archivos usan target="_blank" directamente en vez de <ExternalLink>:\n  ${offenders.join("\n  ")}\n\nUsa <ExternalLink> de @/components/common/ExternalLink para garantizar aviso a11y.`,
    ).toEqual([]);
  });

  it("ExternalLink.tsx incluye rel='noopener noreferrer' y texto sr-only", () => {
    const source = fs.readFileSync(EXTERNAL_LINK_FILE, "utf8");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
    expect(source).toContain("sr-only");
    expect(source).toContain("nueva pestaña");
  });
});

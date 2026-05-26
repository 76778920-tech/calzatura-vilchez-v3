import sharp from "sharp";
import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const ASSETS_DIR = join(process.cwd(), "src", "assets");
const QUALITY = 82;

async function findPngs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findPngs(full)));
    } else if (extname(entry.name).toLowerCase() === ".png") {
      files.push(full);
    }
  }
  return files;
}

async function convert(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, ".webp");
  const originalStat = await stat(pngPath);
  const originalKB = (originalStat.size / 1024).toFixed(0);

  await sharp(pngPath)
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(webpPath);

  const newStat = await stat(webpPath);
  const newKB = (newStat.size / 1024).toFixed(0);
  const reduction = (((originalStat.size - newStat.size) / originalStat.size) * 100).toFixed(1);

  console.log(`  ${basename(pngPath)} → ${basename(webpPath)}  |  ${originalKB} KB → ${newKB} KB  (−${reduction}%)`);

  return { original: originalStat.size, converted: newStat.size };
}

const pngs = await findPngs(ASSETS_DIR);
console.log(`\nConvirtiendo ${pngs.length} PNGs a WebP (quality=${QUALITY})...\n`);

let totalOriginal = 0;
let totalConverted = 0;

for (const png of pngs) {
  const { original, converted } = await convert(png);
  totalOriginal += original;
  totalConverted += converted;
}

const totalOrigMB = (totalOriginal / 1024 / 1024).toFixed(1);
const totalNewMB = (totalConverted / 1024 / 1024).toFixed(1);
const totalReduction = (((totalOriginal - totalConverted) / totalOriginal) * 100).toFixed(1);

console.log(`\n${"=".repeat(60)}`);
console.log(`  TOTAL: ${totalOrigMB} MB → ${totalNewMB} MB  (−${totalReduction}%)`);
console.log(`${"=".repeat(60)}\n`);

const deleteOriginals = process.argv.includes("--delete");
if (deleteOriginals) {
  console.log("Eliminando PNGs originales...");
  for (const png of pngs) {
    await unlink(png);
  }
  console.log(`${pngs.length} PNGs eliminados.\n`);
} else {
  console.log('Tip: usa --delete para eliminar los PNGs originales después de convertir.\n');
}

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const ASSETS_DIR = join(PROJECT_ROOT, "src", "assets", "home");
const OUTPUT_FILE = join(PROJECT_ROOT, "src", "constants", "cloudinaryHomeImages.ts");
const UPLOAD_FOLDER = "calzatura/home";
const IMAGE_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (val && !process.env[key]) process.env[key] = val;
  }
  console.log(`  Env loaded: ${filePath}`);
}

loadEnvFile(join(PROJECT_ROOT, "bff", ".env"));
loadEnvFile(join(PROJECT_ROOT, ".env.local"));
loadEnvFile(join(PROJECT_ROOT, ".env"));

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

const USE_SIGNED = Boolean(API_KEY && API_SECRET);

if (!CLOUD_NAME) {
  console.error("Error: CLOUDINARY_CLOUD_NAME not found.");
  process.exit(1);
}
if (!USE_SIGNED && !UPLOAD_PRESET) {
  console.error(`
Error: No Cloudinary credentials found.

Option A (signed): set CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
Option B (unsigned): set CLOUDINARY_UPLOAD_PRESET (or VITE_CLOUDINARY_UPLOAD_PRESET)
`);
  process.exit(1);
}

function signParams(params) {
  const sorted = Object.keys(params).sort();
  const toSign = sorted.map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(`${toSign}${API_SECRET}`).digest("hex");
}

async function findImages(dir, acc = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await findImages(full, acc);
    else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) acc.push(full);
  }
  return acc;
}

function buildMultipartBody(fields, filePath, fileBuffer) {
  const boundary = `----CloudinaryBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
  }

  const ext = extname(filePath).slice(1);
  const mimeType = ext === "webp" ? "image/webp" : ext === "png" ? "image/png" : "image/jpeg";
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${basename(filePath)}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(parts.join("")),
    Buffer.from(fileHeader),
    fileBuffer,
    Buffer.from(fileFooter),
  ]);

  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function uploadImage(filePath) {
  const rel = relative(ASSETS_DIR, filePath).replaceAll("\\", "/");
  const nameWithoutExt = rel.replace(/\.[^.]+$/, "");
  const publicId = `${UPLOAD_FOLDER}/${nameWithoutExt}`;
  const fileBuffer = await readFile(filePath);
  const fileStat = await stat(filePath);
  const sizeKB = Math.round(fileStat.size / 1024);

  const fields = { public_id: publicId };

  if (USE_SIGNED) {
    const timestamp = Math.round(Date.now() / 1000);
    fields.overwrite = "true";
    const sigParams = { overwrite: "true", public_id: publicId, timestamp };
    fields.api_key = API_KEY;
    fields.timestamp = String(timestamp);
    fields.signature = signParams(sigParams);
  } else {
    fields.upload_preset = UPLOAD_PRESET;
  }

  const { body, contentType } = buildMultipartBody(fields, filePath, fileBuffer);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", headers: { "Content-Type": contentType }, body }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} — ${text}`);
  }

  const data = await response.json();
  return { publicId: data.public_id, secureUrl: data.secure_url, sizeKB };
}

const NAME_MAP = {
  "hero-hombre-botin-ai": "heroHombreBotin",
  "hero-formal-ai": "heroFormal",
  "hero-mujer-ai": "heroMujer",
  "hero-ninos-ai": "heroNinos",
  "hero-ofertas-ai": "heroOfertas",
  "hero-zapatillas-ai": "heroZapatillas",
  "cyber-wow-campaign-ai": "cyberWowCampaign",
  "cyber-wow-campaign-mobile-ai": "cyberWowCampaignMobile",
  "cyber-escolar-vertical-ai": "cyberEscolarVertical",
  "cyber-zapatillas-vertical-ai": "cyberZapatillasVertical",
  "categories/category-children-editorial": "categoryChildrenEditorial",
  "categories/category-men-editorial": "categoryMenEditorial",
  "categories/category-sneakers-editorial": "categorySneakersEditorial",
  "categories/category-women-editorial": "categoryWomenEditorial",
  "trends/trend-nueva-temporada-ai": "trendNuevaTemporada",
  "trends/trend-pasos-radiantes-ai": "trendPasosRadiantes",
  "trends/trend-urban-glow-ai": "trendUrbanGlow",
  "trends/trend-sunset-chic-ai": "trendSunsetChic",
  "cyber/cyber-hombre-editorial": "cyberHombreEditorial",
  "cyber/cyber-mujer-editorial": "cyberMujerEditorial",
  "cyber/cyber-infantil-editorial": "cyberInfantilEditorial",
  "cyber/cyber-zapatillas-editorial": "cyberZapatillasEditorial",
  "cyber/cyber-wow-juvenil-editorial": "cyberWowJuvenilEditorial",
  "cyber/cyber-wow-zapatillas-editorial": "cyberWowZapatillasEditorial",
};

function toConstantName(relativePath) {
  const key = relativePath.replace(/\.[^.]+$/, "").replaceAll("\\", "/");
  return NAME_MAP[key] || key.replaceAll("/", "_").replaceAll("-", "_");
}

function generateConstantsFile(uploads) {
  const cdnBase = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
  const transform = "f_auto,q_auto";

  const lines = [
    `const CDN = "${cdnBase}";`,
    `const T = "${transform}";`,
    "",
  ];

  for (const { publicId, relativePath } of uploads) {
    const constName = toConstantName(relativePath);
    lines.push(`export const ${constName} = \`\${CDN}/\${T}/${publicId}\`;`);
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  console.log(`\nCloudinary Upload`);
  console.log(`  Cloud: ${CLOUD_NAME}`);
  console.log(`  Mode: ${USE_SIGNED ? "signed (API key)" : `unsigned (preset: ${UPLOAD_PRESET})`}`);
  console.log(`  Folder: ${UPLOAD_FOLDER}\n`);

  const images = await findImages(ASSETS_DIR);
  if (images.length === 0) {
    console.log("No images found in src/assets/home/");
    process.exit(0);
  }

  console.log(`Found ${images.length} images to upload.\n`);

  const uploads = [];
  for (const img of images.sort()) {
    const rel = relative(ASSETS_DIR, img).replaceAll("\\", "/");
    process.stdout.write(`  ${rel} ...`);
    try {
      const result = await uploadImage(img);
      console.log(` OK (${result.sizeKB} KB)`);
      uploads.push({ ...result, relativePath: rel });
    } catch (err) {
      console.error(` FAILED\n    ${err.message}`);
      process.exit(1);
    }
  }

  await mkdir(join(PROJECT_ROOT, "src", "constants"), { recursive: true });
  const content = generateConstantsFile(uploads);
  await writeFile(OUTPUT_FILE, content, "utf8");
  console.log(`\nGenerated: ${relative(PROJECT_ROOT, OUTPUT_FILE)} (${uploads.length} exports)`);
  console.log("Done.\n");
}

main();

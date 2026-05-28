import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let match = fs.readFileSync(path.join(root, "shared/catalogMatch.cjs"), "utf8");
match = match.replace(/^"use strict";\r?\n\r?\n/, "");
match = match.replace(/\r?\nmodule\.exports = \{[\s\S]*$/, "");
match = match.replace(/^function /gm, "export function ");
fs.writeFileSync(path.join(root, "shared/catalogMatch.ts"), match);

let filter = fs.readFileSync(path.join(root, "shared/catalogPublicFilter.cjs"), "utf8");
filter = filter.replace(/^"use strict";\r?\n\r?\n/, "");
filter = filter.replace(
  /const \{[\s\S]*?\} = require\("\.\/catalogMatch\.cjs"\);\r?\n\r?\n/,
  `import {
  slugifyCatalogValue,
  productMatchesCategory,
  productMatchesSearch,
  productMatchesBrandSlug,
  productMatchesTaxonomy,
  getProductColors,
} from "./catalogMatch";

`,
);
filter = filter.replace(/\r?\nconst catalogPublicFilterExports = \{[\s\S]*$/, "");
filter = filter.replace(/^const (MATERIAL_)/gm, "export const $1");
filter = filter.replace(/^function /gm, "export function ");
fs.writeFileSync(path.join(root, "shared/catalogPublicFilter.ts"), filter);

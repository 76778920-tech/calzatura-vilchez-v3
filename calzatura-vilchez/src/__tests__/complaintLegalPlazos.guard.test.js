import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  COMPLAINT_DETALLE_MIN_LENGTH,
  COMPLAINT_LEGAL_PLAZOS,
} from "@/domains/publico/utils/complaintLegalPlazos";

const require = createRequire(import.meta.url);
const bffConstants = require("../../bff/complaintLegalConstants.cjs");

const read = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("complaintLegalPlazos — sync BFF", () => {
  it("sincroniza constantes numéricas con complaintLegalConstants.cjs", () => {
    expect(COMPLAINT_DETALLE_MIN_LENGTH).toBe(bffConstants.COMPLAINT_DETALLE_MIN_LENGTH);
    expect(COMPLAINT_LEGAL_PLAZOS).toEqual(bffConstants.COMPLAINT_LEGAL_PLAZOS);
  });
});

describe("complaintLegalPlazos — coherencia en código fuente", () => {
  it("InfoPage importa el módulo legal y no conserva el texto obsoleto de plazos", () => {
    const source = read("src/domains/publico/pages/InfoPage.tsx");
    expect(source).toContain("complaintPlazosInfoPageBody");
    expect(source).not.toContain("Respuesta definitiva: hasta 30 días calendario");
  });

  it("libroReclamaciones.cjs usa complaintLegalConstants", () => {
    const source = read("bff/libroReclamaciones.cjs");
    expect(source).toContain("complaintLegalConstants.cjs");
    expect(source).toContain("COMPLAINT_DETALLE_MIN_LENGTH");
  });
});

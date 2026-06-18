import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const bffServer = fs.readFileSync(path.resolve(process.cwd(), "bff/server.cjs"), "utf8");
const libroBff = fs.readFileSync(path.resolve(process.cwd(), "bff/libroReclamaciones.cjs"), "utf8");

describe("Cumplimiento funcional — contenido legal en código", () => {
  it("privacidad.json referencia Ley 29733 y plazo ARCO 15 días hábiles", () => {
    const json = fs.readFileSync(
      path.resolve(process.cwd(), "src/domains/publico/content/legal/data/privacidad.json"),
      "utf8",
    );
    expect(json).toContain("29733");
    expect(json).toContain("quince (15) días hábiles");
  });

  it("terminos.json referencia Ley 29571 y libro de reclamaciones", () => {
    const json = fs.readFileSync(
      path.resolve(process.cwd(), "src/domains/publico/content/legal/data/terminos.json"),
      "utf8",
    );
    expect(json).toContain("29571");
    expect(json).toContain("Libro de reclamaciones");
  });

  it("plazos libro reclamaciones sincronizados 3 / 15 / 30", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/domains/publico/utils/complaintLegalPlazos.ts"),
      "utf8",
    );
    expect(src).toContain("acuseDiasHabiles: 3");
    expect(src).toContain("respuestaDiasHabiles: 15");
    expect(src).toContain("prorrogaDiasCalendario: 30");
  });

  it("BFF expone POST /libro-reclamaciones para hoja virtual", () => {
    expect(libroBff).toMatch(/app\.post\(["']\/libro-reclamaciones["']/);
    expect(libroBff).toMatch(/app\.get\(["']\/libro-reclamaciones\/consulta-codigo["']/);
    expect(bffServer).toContain("registerLibroReclamacionesRoutes(app");
  });
});

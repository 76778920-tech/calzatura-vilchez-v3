import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEGAL_RF_IDS,
  MUST_RF_IDS,
} from "../../../scripts/iso25000-must-rf-manifest.mjs";

const cuT05Path = path.resolve(
  process.cwd(),
  "../documentacion/cuadros-excel/CU-T05-requisitos.csv",
);
const cuT07Path = path.resolve(
  process.cwd(),
  "../documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv",
);

function parseCuT05Ids() {
  const csv = fs.readFileSync(cuT05Path, "utf8");
  const ids = new Set();
  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const id = line.split(",")[0]?.trim();
    if (id) ids.add(id);
  }
  return ids;
}

function cuT05Status(id) {
  const csv = fs.readFileSync(cuT05Path, "utf8");
  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line.startsWith(id + ",")) continue;
    const cols = line.split(",");
    return cols[5]?.trim();
  }
  return null;
}

describe("Cumplimiento funcional — catálogo SRS CU-T05", () => {
  it("CU-T05 contiene los 26 RF Must del manifest", () => {
    const ids = parseCuT05Ids();
    const missing = MUST_RF_IDS.filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it("CU-T05 contiene los 4 RF-LEG de cumplimiento legal", () => {
    const ids = parseCuT05Ids();
    const missing = LEGAL_RF_IDS.filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it("RF Must y RF-LEG en CU-T05 están Implementado", () => {
    const offenders = [...MUST_RF_IDS, ...LEGAL_RF_IDS].filter(
      (id) => cuT05Status(id) !== "Implementado",
    );
    expect(offenders).toEqual([]);
  });

  it("CU-T07 contiene casos TC-CMP-001…005", () => {
    const csv = fs.readFileSync(cuT07Path, "utf8");
    for (const id of ["TC-CMP-001", "TC-CMP-002", "TC-CMP-003", "TC-CMP-004", "TC-CMP-005"]) {
      expect(csv).toContain(id);
    }
  });
});

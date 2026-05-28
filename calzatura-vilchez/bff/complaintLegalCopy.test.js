import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  complaintPlazosConstanciaBullets,
  complaintPlazosResumenCorto,
} from "./complaintLegalCopy.cjs";

const require = createRequire(import.meta.url);
const { COMPLAINT_LEGAL_PLAZOS } = require("./complaintLegalConstants.cjs");

describe("complaintLegalCopy (BFF)", () => {
  it("plazos alineados con complaintLegalConstants", () => {
    const corpus = [complaintPlazosResumenCorto(), ...complaintPlazosConstanciaBullets()].join(" ");
    expect(corpus).toContain(String(COMPLAINT_LEGAL_PLAZOS.acuseDiasHabiles));
    expect(corpus).toContain(String(COMPLAINT_LEGAL_PLAZOS.respuestaDiasHabiles));
    expect(corpus).toContain(String(COMPLAINT_LEGAL_PLAZOS.prorrogaDiasCalendario));
  });

  it("viñetas incluyen formato legal con cifra entre paréntesis", () => {
    expect(complaintPlazosConstanciaBullets()[0]).toMatch(/quince \(15\)/);
    expect(complaintPlazosConstanciaBullets()[1]).toMatch(/tres \(3\)/);
  });
});

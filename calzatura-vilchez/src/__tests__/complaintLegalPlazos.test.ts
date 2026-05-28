import { describe, expect, it } from "vitest";
import {
  COMPLAINT_DETALLE_MIN_LENGTH,
  COMPLAINT_LEGAL_CONSTANCIA_BULLETS,
  COMPLAINT_LEGAL_PLAZOS,
  COMPLAINT_VALIDATION_MESSAGES,
  complaintPlazosInfoPageBody,
  complaintPlazosNotaPanel,
  complaintPlazosResumenCorto,
  complaintPlazosTerminosReferencia,
  diasConCifraLegal,
} from "@/domains/publico/utils/complaintLegalPlazos";

describe("complaintLegalPlazos", () => {
  it("formatea días en estilo legal peruano", () => {
    expect(diasConCifraLegal(15)).toBe("quince (15)");
    expect(diasConCifraLegal(3)).toBe("tres (3)");
  });

  it("mantiene plazos 3 / 15 / 30 en el corpus legal unificado", () => {
    const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
    const corpus = [
      complaintPlazosResumenCorto(),
      complaintPlazosNotaPanel(),
      complaintPlazosTerminosReferencia(),
      ...complaintPlazosInfoPageBody(),
      ...COMPLAINT_LEGAL_CONSTANCIA_BULLETS,
    ].join(" ");
    expect(corpus).toContain(String(acuseDiasHabiles));
    expect(corpus).toContain(String(respuestaDiasHabiles));
    expect(corpus).toContain(String(prorrogaDiasCalendario));
  });

  it("no usa el plazo erróneo «respuesta definitiva: hasta 30 días calendario» sin 15 hábiles", () => {
    const resumen = complaintPlazosResumenCorto();
    expect(resumen).not.toMatch(/respuesta definitiva.*30 días calendario/i);
    expect(resumen).toContain("15");
    expect(resumen).toContain("30");
  });

  it("expone mensajes de validación coherentes con el mínimo de detalle", () => {
    expect(COMPLAINT_VALIDATION_MESSAGES.detalleMinLength()).toContain(
      String(COMPLAINT_DETALLE_MIN_LENGTH),
    );
    expect(COMPLAINT_VALIDATION_MESSAGES.detallePlaceholder()).toContain(
      String(COMPLAINT_DETALLE_MIN_LENGTH),
    );
  });
});

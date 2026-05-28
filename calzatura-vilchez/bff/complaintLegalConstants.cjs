"use strict";

/**
 * Constantes legales del libro de reclamaciones (Ley N.° 29571).
 * Mantener sincronizado con `src/domains/publico/utils/complaintLegalPlazos.ts`
 * (ver test `complaintLegalPlazos.test.ts`).
 */
const COMPLAINT_DETALLE_MIN_LENGTH = 10;

const COMPLAINT_LEGAL_PLAZOS = Object.freeze({
  acuseDiasHabiles: 3,
  respuestaDiasHabiles: 15,
  prorrogaDiasCalendario: 30,
});

module.exports = {
  COMPLAINT_DETALLE_MIN_LENGTH,
  COMPLAINT_LEGAL_PLAZOS,
};

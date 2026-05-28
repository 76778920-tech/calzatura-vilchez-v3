"use strict";

const { COMPLAINT_LEGAL_PLAZOS } = require("./complaintLegalConstants.cjs");

const COMPLAINT_LAW_SHORT = "Ley N.° 29571";

const DIA_LEGAL_ES = {
  3: ["tres", 3],
  15: ["quince", 15],
  30: ["treinta", 30],
};

function diasConCifraLegal(dias) {
  const entry = DIA_LEGAL_ES[dias];
  if (entry) return `${entry[0]} (${entry[1]})`;
  return String(dias);
}

function complaintPlazosResumenCorto() {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return (
    `Acuse de recibo en un plazo máximo de ${acuseDiasHabiles} días hábiles; respuesta en un plazo no mayor de ${respuestaDiasHabiles} días hábiles, prorrogable hasta por ${prorrogaDiasCalendario} días calendario adicionales cuando el caso lo justifique.`
  );
}

function complaintPlazosConstanciaBullets() {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return [
    `El proveedor dará respuesta al consumidor en un plazo no mayor de ${diasConCifraLegal(respuestaDiasHabiles)} días hábiles, prorrogables hasta por ${diasConCifraLegal(prorrogaDiasCalendario)} días calendario adicionales cuando el caso lo justifique.`,
    `Se entregará acuse de recibo en un plazo máximo de ${diasConCifraLegal(acuseDiasHabiles)} días hábiles desde la presentación.`,
    "El trámite ante el libro de reclamaciones es gratuito para el consumidor.",
    "La presentación de esta hoja no impide acudir a otras vías de solución de controversias ni a Indecopi.",
  ];
}

module.exports = {
  COMPLAINT_LAW_SHORT,
  complaintPlazosResumenCorto,
  complaintPlazosConstanciaBullets,
};

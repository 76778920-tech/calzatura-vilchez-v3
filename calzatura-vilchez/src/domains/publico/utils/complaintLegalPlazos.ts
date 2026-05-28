/**
 * Fuente única de plazos y mensajes legales del libro de reclamaciones (Ley N.° 29571).
 * Usado en formulario, constancia, panel, página legal e InfoPage.
 *
 * Sincronizar numéricamente con `bff/complaintLegalConstants.cjs`.
 */

export const COMPLAINT_LAW_SHORT = "Ley N.° 29571" as const;

export const COMPLAINT_LAW_FULL =
  "Ley N.° 29571 — Código de Protección y Defensa del Consumidor" as const;

/** Mínimo exigido por el BFF (`validateComplaintPayload`). */
export const COMPLAINT_DETALLE_MIN_LENGTH = 10;

export const COMPLAINT_LEGAL_PLAZOS = {
  acuseDiasHabiles: 3,
  respuestaDiasHabiles: 15,
  prorrogaDiasCalendario: 30,
} as const;

const DIA_LEGAL_ES: Readonly<Record<number, readonly [palabra: string, cifra: number]>> = {
  3: ["tres", 3],
  15: ["quince", 15],
  30: ["treinta", 30],
};

/** Formato legal peruano habitual: «quince (15)». */
export function diasConCifraLegal(dias: number): string {
  const entry = DIA_LEGAL_ES[dias];
  if (entry) return `${entry[0]} (${entry[1]})`;
  return String(dias);
}

function buildConstanciaBullets(): readonly string[] {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return [
    `El proveedor dará respuesta al consumidor en un plazo no mayor de ${diasConCifraLegal(respuestaDiasHabiles)} días hábiles, prorrogables hasta por ${diasConCifraLegal(prorrogaDiasCalendario)} días calendario adicionales cuando el caso lo justifique.`,
    `Se entregará acuse de recibo en un plazo máximo de ${diasConCifraLegal(acuseDiasHabiles)} días hábiles desde la presentación.`,
    "El trámite ante el libro de reclamaciones es gratuito para el consumidor.",
    "La presentación de esta hoja no impide acudir a otras vías de solución de controversias ni a Indecopi.",
  ] as const;
}

/** Viñetas sección VI de la constancia (React e HTML de impresión). */
export const COMPLAINT_LEGAL_CONSTANCIA_BULLETS = buildConstanciaBullets();

/** Mensajes de validación del formulario web (paridad semántica con BFF). */
export const COMPLAINT_VALIDATION_MESSAGES = {
  detalleRequired: "Describe el problema y qué solución solicitas",
  detalleMinLength: (min: number = COMPLAINT_DETALLE_MIN_LENGTH) =>
    `El detalle debe tener al menos ${min} caracteres`,
  detallePlaceholder: (min: number = COMPLAINT_DETALLE_MIN_LENGTH) =>
    `Describe el problema y la solución que solicitas (mín. ${min} caracteres)`,
} as const;

/** Pantalla de éxito tras registrar la hoja virtual. */
export function complaintPlazosResumenCorto(): string {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return (
    `Acuse de recibo en un plazo máximo de ${acuseDiasHabiles} días hábiles; respuesta en un plazo no mayor de ${respuestaDiasHabiles} días hábiles, prorrogable hasta por ${prorrogaDiasCalendario} días calendario adicionales cuando el caso lo justifique.`
  );
}

/** Pie del panel de canales (formulario virtual). */
export function complaintPlazosNotaPanel(): string {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return (
    `Trámite gratuito. Plazos (${COMPLAINT_LAW_SHORT}): acuse de recibo hasta ${acuseDiasHabiles} días hábiles; respuesta hasta ${respuestaDiasHabiles} días hábiles, prorrogable hasta ${prorrogaDiasCalendario} días calendario adicionales si aplica.`
  );
}

/** Sección «Plazos y costo» de la página legal `/legal/libro-reclamaciones`. */
export function complaintPlazosInfoPageBody(): readonly string[] {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return [
    `Conforme a la ${COMPLAINT_LAW_FULL}, el proveedor debe entregar acuse de recibo de la hoja en un plazo máximo de ${diasConCifraLegal(acuseDiasHabiles)} días hábiles, contados desde la presentación.`,
    `La respuesta al consumidor debe emitirse en un plazo no mayor de ${diasConCifraLegal(respuestaDiasHabiles)} días hábiles. Dicho plazo puede prorrogarse hasta por ${diasConCifraLegal(prorrogaDiasCalendario)} días calendario adicionales cuando el caso lo justifique; en ese supuesto se informará al consumidor antes del vencimiento del plazo original.`,
    "El trámite ante el libro de reclamaciones es gratuito. Los datos personales se tratan conforme a nuestra Política de privacidad.",
  ] as const;
}

/** Referencia breve en Términos y Condiciones (sección libro de reclamaciones). */
export function complaintPlazosTerminosReferencia(): string {
  const { acuseDiasHabiles, respuestaDiasHabiles, prorrogaDiasCalendario } = COMPLAINT_LEGAL_PLAZOS;
  return (
    `Los plazos de acuse (${acuseDiasHabiles} días hábiles) y de respuesta (${respuestaDiasHabiles} días hábiles, prorrogables hasta ${prorrogaDiasCalendario} días calendario adicionales si aplica) se detallan en la página «Libro de reclamaciones» del sitio y en la constancia de cada hoja registrada por el formulario virtual.`
  );
}

/** Acento visual de la página legal del libro. */
export function complaintPlazosInfoPageAccent(): string {
  const { acuseDiasHabiles, respuestaDiasHabiles } = COMPLAINT_LEGAL_PLAZOS;
  return `Trámite gratuito · Acuse ${acuseDiasHabiles} días hábiles · Respuesta ${respuestaDiasHabiles} días hábiles (${COMPLAINT_LAW_SHORT})`;
}

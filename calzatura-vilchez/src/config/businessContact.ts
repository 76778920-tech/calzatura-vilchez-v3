/** Datos de contacto, identificación tributaria y domicilio para páginas legales y libro de reclamaciones. */
export const BUSINESS_CONTACT = {
  name: "Calzatura Vilchez",
  legalName: "Calzatura Vilchez",
  ruc: "10200281875",
  /** RUC con guiones para exhibición pública (Perú). */
  rucDisplay: "10-20028187-5",
  address: "Mercado Modelo, interior N.° 732, Huancayo, Junín, Perú",
  phoneDisplay: "+51 964 052 530",
  phoneE164: "51964052530",
  whatsappBaseUrl: "https://wa.me/51964052530",
  hours: "lunes a domingo, de 9:00 a. m. a 7:30 p. m.",
  indecopiUrl: "https://www.indecopi.gob.pe/",
} as const;

/** Párrafos reutilizables en términos, privacidad y libro de reclamaciones. */
export function providerIdentificationParagraphs(): string[] {
  const c = BUSINESS_CONTACT;
  return [
    `${c.legalName}, identificada con RUC N.° ${c.rucDisplay}, dedicada a la comercialización de calzado y artículos afines.`,
    `Domicilio de atención al público: ${c.address}.`,
    `Teléfono y WhatsApp: ${c.phoneDisplay}. Horario: ${c.hours}.`,
  ];
}

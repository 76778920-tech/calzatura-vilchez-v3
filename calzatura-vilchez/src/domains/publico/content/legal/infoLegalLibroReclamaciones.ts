import {
  complaintPlazosInfoPageAccent,
  complaintPlazosInfoPageBody,
} from "@/domains/publico/utils/complaintLegalPlazos";
import {
  buildLegalPage,
  legalSections,
  legalUpdatedNote,
  providerLegalSection,
} from "../infoPageBuilders";

export const LIBRO_LEGAL_PAGE = buildLegalPage({
  title: "Libro de reclamaciones",
  intro:
    "Conforme a la Ley N.° 29571, Calzatura Vilchez dispone de libro de reclamaciones físico en tienda y canales de atención en línea. Puedes presentar tu hoja de forma presencial, por WhatsApp o, si lo prefieres, mediante el formulario virtual.",
  accent: complaintPlazosInfoPageAccent(),
  note: legalUpdatedNote("También puedes acudir a Indecopi si lo consideras necesario."),
  highlights: [],
  sections: legalSections(
    providerLegalSection(
      "1. Proveedor y canales",
      "La forma más habitual es solicitar la hoja impresa en tienda o escribirnos por WhatsApp. El formulario web registra la hoja en nuestro libro virtual con código de referencia.",
    ),
    ["2. Reclamo y queja",
      "Reclamo: disconformidad con el producto o servicio (defecto, talla errónea, cobro indebido, demora de entrega, etc.).",
      "Queja: disconformidad con la atención recibida. Ambos se tramitan de la misma forma.",
    ],
    ["3. Plazos y costo", ...complaintPlazosInfoPageBody()],
    ["4. Indecopi",
      "Presentar una hoja aquí no impide acudir a Indecopi (www.indecopi.gob.pe) u otras vías de defensa del consumidor.",
    ],
    ["5. Presentar tu hoja",
      "Elige el canal que te resulte más cómodo. No es obligatorio usar el formulario web.",
    ],
  ),
  faq: [],
});

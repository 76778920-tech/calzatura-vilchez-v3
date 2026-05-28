import { providerIdentificationParagraphs } from "@/config/businessContact";
import {
  complaintPlazosInfoPageAccent,
  complaintPlazosInfoPageBody,
} from "@/domains/publico/utils/complaintLegalPlazos";
import { buildInfoProsePage, legalSections } from "../infoPageBuilders";

const PROVIDER_ID_BODY = providerIdentificationParagraphs();

export const LIBRO_LEGAL_PAGE = buildInfoProsePage({
      group: "legal",
    kicker: "Legal",
    title: "Libro de reclamaciones",
    intro:
      "Conforme a la Ley N.° 29571, Calzatura Vilchez dispone de libro de reclamaciones físico en tienda y canales de atención en línea. Puedes presentar tu hoja de forma presencial, por WhatsApp o, si lo prefieres, mediante el formulario virtual.",
    accent: complaintPlazosInfoPageAccent(),
    note: "Última actualización: 26 de mayo de 2026. También puedes acudir a Indecopi si lo consideras necesario.",
    highlights: [],
  sections: legalSections(
      ["1. Proveedor y canales",
        ...PROVIDER_ID_BODY,
        "La forma más habitual es solicitar la hoja impresa en tienda o escribirnos por WhatsApp. El formulario web registra la hoja en nuestro libro virtual con código de referencia.",
      ],
      ["2. Reclamo y queja",
        "Reclamo: disconformidad con el producto o servicio (defecto, talla errónea, cobro indebido, demora de entrega, etc.).",
        "Queja: disconformidad con la atención recibida. Ambos se tramitan de la misma forma.",
      ],
      ["3. Plazos y costo",
        ...complaintPlazosInfoPageBody(),
      ],
      ["4. Indecopi",
        "Presentar una hoja aquí no impide acudir a Indecopi (www.indecopi.gob.pe) u otras vías de defensa del consumidor.",
      ],
      ["5. Presentar tu hoja",
        "Elige el canal que te resulte más cómodo. No es obligatorio usar el formulario web.",
      ]
  ),
  faq: [],
});

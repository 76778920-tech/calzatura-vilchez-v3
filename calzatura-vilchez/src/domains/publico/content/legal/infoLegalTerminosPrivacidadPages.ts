import terminosDefinitionJson from "./data/terminos.json";
import privacidadDefinitionJson from "./data/privacidad.json";
import {
  buildLegalPageFromDefinition,
  type LegalPageDefinition,
} from "./legalPageFromDefinition";

const terminosDefinition = terminosDefinitionJson as LegalPageDefinition;
const privacidadDefinition = privacidadDefinitionJson as LegalPageDefinition;

export const TERMINOS_LEGAL_PAGE = buildLegalPageFromDefinition(terminosDefinition);
export const PRIVACIDAD_LEGAL_PAGE = buildLegalPageFromDefinition(privacidadDefinition);

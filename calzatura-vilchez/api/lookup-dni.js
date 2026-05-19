/**
 * Vercel Serverless: consulta DNI con failover entre proveedores.
 * Lógica compartida con el BFF Render (`bff/lookupDni.cjs`).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handleLookupDni } = require("../bff/lookupDni.cjs");

export default handleLookupDni;

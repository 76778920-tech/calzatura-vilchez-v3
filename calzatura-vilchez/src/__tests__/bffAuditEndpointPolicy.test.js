import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverSource = fs.readFileSync(
  path.resolve(process.cwd(), "bff/server.cjs"),
  "utf8",
);
const lookupDniSource = fs.readFileSync(
  path.resolve(process.cwd(), "bff/lookupDni.cjs"),
  "utf8",
);
const firebaseConfigSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/firebase/config.ts"),
  "utf8",
);
const firebaseHostingConfigSource = fs.readFileSync(
  path.resolve(process.cwd(), "firebase.json"),
  "utf8",
);
const deployWorkflowSource = fs.readFileSync(
  path.resolve(process.cwd(), "../.github/workflows/deploy-production.yml"),
  "utf8",
);
const historicalAuditRedactionMigration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260521130000_redact_historical_auditoria_pii.sql"),
  "utf8",
);
const auditPiiAtInsertMigration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260530150000_auditoria_pii_enforce_at_insert.sql"),
  "utf8",
);
const usuariosSeguroViewMigration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260531120000_fix_usuarios_seguro_security_invoker.sql"),
  "utf8",
);
const linterRemediationMigration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260531200000_supabase_security_linter_remediation.sql"),
  "utf8",
);
const rlsServiceRolePoliciesMigration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260531210000_rls_service_role_policies_no_client.sql"),
  "utf8",
);
const auditPiiModule = fs.readFileSync(
  path.resolve(process.cwd(), "bff/auditPii.cjs"),
  "utf8",
);

describe("BFF /audit policy guards", () => {
  it("verifica rol y allowlist antes de persistir auditoria enviada por cliente", () => {
    expect(serverSource).toContain("fetchAuditActorRole(supabase, decodedToken)");
    expect(serverSource).toContain("assertClientAuditAllowed({");
    expect(serverSource).toContain("ADMIN_CLIENT_AUDIT_POLICY");
    expect(serverSource).toContain("STAFF_CLIENT_AUDIT_POLICY");
    expect(serverSource).toContain("SELF_USER_AUDIT_ACTIONS");
  });

  it("marca eventos de cliente para distinguirlos de auditoria generada por servidor", () => {
    expect(serverSource).toContain("clientSubmitted: true");
  });

  it("sanitiza entidadNombre con reglas por entidad antes del insert", () => {
    expect(serverSource).toContain('require("./auditPii.cjs")');
    expect(serverSource).toContain("sanitizeAuditEntityLabel");
    expect(auditPiiModule).toContain("function sanitizeAuditEntityLabel");
    expect(auditPiiModule).toContain("ENTITY_REF_ENTITIES");
    expect(serverSource).toContain("const safeEntidadNombre = options.entityLabelResolved === true");
    expect(serverSource).toContain("entidadNombre: safeEntidadNombre");
  });

  it("no mantiene labels personales de fabricantes en ninguna ruta BFF", () => {
    expect(serverSource).not.toContain("stripManufacturerPersonPrefix");
    expect(serverSource).toContain('["usuario", "pedido", "venta", "fabricante", "importar"].includes(entity)');
    expect(serverSource).toContain("return safeAuditEntityRef(entity, id)");
  });

  it("resuelve labels seguros server-side para eventos enviados por cliente", () => {
    expect(serverSource).toContain("async function resolveClientAuditEntityLabel");
    expect(serverSource).toContain('["usuario", "pedido", "venta", "fabricante", "importar"].includes(entity)');
    expect(serverSource).toContain('.from("productos")');
    expect(serverSource).toContain('.select("nombre")');
    expect(serverSource).toContain("Fallback seguro abajo: nunca usar el label enviado por cliente para productos.");
    expect(serverSource).toContain("const safeEntidadNombre = await resolveClientAuditEntityLabel(");
  });

  it("evita doble sanitizacion cuando /audit ya resolvio un label seguro", () => {
    expect(serverSource).toContain("options.entityLabelResolved === true");
    expect(serverSource).toContain("? sanitizeAuditLabel(entidadNombre)");
    expect(serverSource).toContain("{ entityLabelResolved: true }");
  });

  it("bloquea cambios de nombres por /users/me sin lookupToken valido", () => {
    expect(serverSource).toContain("hasIncomingLegalIdentity");
    expect(serverSource).toContain("Validacion de DNI requerida para registrar identidad");
    expect(serverSource).toContain("identityChangedWithoutLookup");
    expect(serverSource).toContain("Validacion de DNI requerida para cambiar nombres");
    expect(serverSource).toContain('.select("uid,email,rol,creadoEn,dni,dni_hash,nombres,apellidos,nombre")');
  });

  it("falla cerrado para DNI/App Check en produccion", () => {
    expect(serverSource).toContain("function requireDniAppCheck()");
    expect(serverSource).toContain("function requireDniProofSecret()");
    expect(serverSource).toContain("function validateProductionRuntimeConfig(serviceAccount)");
    expect(serverSource).toContain('"DNI_LOOKUP_PROOF_SECRET"');
    expect(serverSource).toContain('"SUPABASE_SERVICE_ROLE_KEY"');
    expect(serverSource).toContain('"STRIPE_WEBHOOK_SECRET"');
    expect(serverSource).toContain('"AI_SERVICE_BEARER_TOKEN"');
    expect(serverSource).toContain("Configuracion BFF de produccion incompleta");
    expect(serverSource).toContain("if (isProductionRuntime()) return true;");
    expect(serverSource).toContain("requireAppCheck: requireDniAppCheck()");
    expect(serverSource).toContain("requireProofSecret: requireDniProofSecret()");
    expect(lookupDniSource).toContain("process.env.DNI_LOOKUP_PROOF_SECRET?.trim() || \"\"");
    expect(lookupDniSource).not.toContain("|| process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(lookupDniSource).toContain("Validacion DNI no configurada");
    expect(firebaseConfigSource).toContain("VITE_FIREBASE_APPCHECK_SITE_KEY requerido en produccion");
    expect(deployWorkflowSource).toContain("VITE_FIREBASE_APPCHECK_SITE_KEY:");
  });

  it("permite cabecera X-Firebase-AppCheck en CORS del BFF", () => {
    expect(serverSource).toContain("X-Firebase-AppCheck");
    expect(serverSource).toContain('"X-Calzatura-Client"');
  });

  it("prioriza APIsPERU (dniruc.apisperu.com) para consulta DNI de personas naturales", () => {
    expect(lookupDniSource).toContain('name: "apisperu"');
    expect(lookupDniSource).toContain("dniruc.apisperu.com/api/v1/dni/");
    expect(lookupDniSource).toContain('envFirstTrimmed("APISPERU_TOKEN", "APISPERU_DNIRUC_TOKEN")');
  });

  it("no permite deploy productivo sin CI completo ni secrets criticos", () => {
    expect(deployWorkflowSource).toContain("Exigir CI base en success para deploy llamado por CI Integration");
    expect(deployWorkflowSource).toContain("if: github.event_name == 'workflow_call'");
    expect(deployWorkflowSource).toContain("Exigir CI + CI Integration en success para deploy manual");
    expect(deployWorkflowSource).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(deployWorkflowSource).toContain("RENDER_BFF_DEPLOY_HOOK_URL:");
    expect(deployWorkflowSource).toContain("required: true");
    expect(deployWorkflowSource).toContain("VITE_BACKEND_API_URL:");
    expect(deployWorkflowSource).toContain("VITE_SUPABASE_ANON_KEY:");
    expect(deployWorkflowSource).toContain("VITE_STRIPE_PUBLIC_KEY:");
    expect(deployWorkflowSource).toContain("VITE_DNI_LOOKUP_URL:");
    expect(deployWorkflowSource).toContain("run: node scripts/verify-deploy-firebase-secrets.mjs");
    expect(deployWorkflowSource).toContain("run: node scripts/github-verify-workflows-for-sha.mjs");
  });

  it("permite cargar Google Maps JS desde la CSP de Firebase Hosting", () => {
    expect(firebaseHostingConfigSource).toContain("Content-Security-Policy");
    expect(firebaseHostingConfigSource).toContain("script-src 'self'");
    expect(firebaseHostingConfigSource).toContain("https://maps.googleapis.com");
    expect(firebaseHostingConfigSource).toContain("https://fonts.googleapis.com");
    expect(firebaseHostingConfigSource).toContain("https://fonts.gstatic.com");
  });

  it("enmascara usuarioEmail al devolver GET /admin/audit", () => {
    expect(serverSource).toContain("sanitizeAuditEntryForResponse");
    expect(auditPiiModule).toContain("usuarioEmail: entry.usuarioEmail == null ? null : sanitizeAuditEmail");
  });

  it("cierra lint rls_enabled_no_policy en tablas BFF-only", () => {
    expect(rlsServiceRolePoliciesMigration).toContain("service_role_all_movimientosStock");
    expect(rlsServiceRolePoliciesMigration).toContain("service_role_all_productoFinanzas");
    expect(rlsServiceRolePoliciesMigration).toContain("TO service_role");
  });

  it("remedia export linter Supabase (politicas legacy, RPC, search_path)", () => {
    expect(linterRemediationMigration).toContain('DROP POLICY IF EXISTS "anon_insert_pedidos"');
    expect(linterRemediationMigration).toContain('DROP POLICY IF EXISTS "anon full favoritos"');
    expect(linterRemediationMigration).toContain('ALTER TABLE "productoCodigos" ENABLE ROW LEVEL SECURITY');
    expect(linterRemediationMigration).toContain(
      "REVOKE ALL ON FUNCTION decrement_order_stock(jsonb) FROM PUBLIC, anon, authenticated",
    );
    expect(linterRemediationMigration).toContain("SET search_path = public");
  });

  it("corrige linter security_definer_view en usuarios_seguro", () => {
    expect(usuariosSeguroViewMigration).toContain("security_invoker = true");
    expect(usuariosSeguroViewMigration).toContain("REVOKE ALL ON TABLE usuarios_seguro");
    expect(usuariosSeguroViewMigration).toContain("GRANT SELECT ON TABLE usuarios_seguro TO service_role");
  });

  it("normaliza PII en INSERT/UPDATE de auditoria en base de datos", () => {
    expect(auditPiiAtInsertMigration).toContain("trg_auditoria_normalize_pii");
    expect(auditPiiAtInsertMigration).toContain("mask_audit_email");
    expect(auditPiiAtInsertMigration).toContain("fn_audit_pedido_insert");
    expect(auditPiiAtInsertMigration).toContain("insert_auditoria_event");
    expect(auditPiiAtInsertMigration).toContain("useremail");
  });

  it("incluye migracion de saneamiento para auditoria historica con PII", () => {
    expect(historicalAuditRedactionMigration).toContain("UPDATE auditoria");
    expect(historicalAuditRedactionMigration).toContain("entidad IN ('usuario', 'fabricante', 'pedido', 'venta', 'importar')");
    expect(historicalAuditRedactionMigration).toContain('"usuarioEmail"');
    expect(historicalAuditRedactionMigration).toContain("CREATE OR REPLACE FUNCTION redact_audit_detail_pii");
    expect(historicalAuditRedactionMigration).toContain("jsonb_array_elements");
    expect(historicalAuditRedactionMigration).toContain("redact_audit_detail_pii(item.value)");
    expect(historicalAuditRedactionMigration).toContain("[redacted]");
    expect(historicalAuditRedactionMigration).toContain("DROP FUNCTION redact_audit_detail_pii(jsonb)");
  });
});

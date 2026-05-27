import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

const monitor = read("bff/securityMonitor.cjs");
const server = read("bff/server.cjs");
const libro = read("bff/libroReclamaciones.cjs");
const lookup = read("bff/lookupDni.cjs");

describe("alertas de seguridad — superficies cubiertas", () => {
  it("securityMonitor define superficies públicas incl. delivery", () => {
    expect(monitor).toContain("DELIVERY_GEOCODE");
    expect(monitor).toContain("DELIVERY_QUOTE");
    expect(monitor).toContain("AUTH_LOGIN");
    expect(monitor).toContain("LOOKUP_DNI");
  });

  it("rate limits unificados vía publicRateLimit + Upstash store", () => {
    expect(server).toContain("enforceRateLimit");
    expect(server).toContain("publicRateLimit.cjs");
    expect(server).toContain("securityStore.cjs");
    expect(server).toContain("/health/security");
    expect(server).toContain("AUTH_LOGIN_CODE");
    expect(libro).toContain("enforceRateLimit");
    expect(lookup).toContain("enforceRateLimit");
    expect(server).toContain("DELIVERY_GEOCODE");
  });

  it("digest de alertas y auditoría al arranque", () => {
    expect(server).toContain("auditSecurityMonitoringConfig");
    expect(read("bff/securityAlertQueue.cjs")).toContain("recordSecurityAlert");
    expect(read("bff/securityConfig.cjs")).toContain("auditSecurityMonitoringConfig");
  });

  it("lookup aplica rate limit antes de probes de origen", () => {
    const handleBlock = lookup.match(
      /async function handleLookupDni[\s\S]*?const authz = authorizeLookupRequest/,
    )?.[0];
    expect(handleBlock).toBeTruthy();
    const rateIdx = handleBlock.indexOf("enforceRateLimit");
    const authzIdx = handleBlock.indexOf("const authz = authorizeLookupRequest");
    expect(rateIdx).toBeGreaterThan(-1);
    expect(authzIdx).toBeGreaterThan(rateIdx);
  });

  it("health/security no expone detalle completo en producción sin token", () => {
    expect(server).toContain("HEALTH_SECURITY_TOKEN");
    expect(server).toContain("issueCount");
  });
});

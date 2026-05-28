import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildComplaintConsumerEmailHtml,
  buildComplaintConsumerEmailSubject,
  buildComplaintConsumerEmailText,
  isConsumerEmailEnabled,
  LIBRO_LEGAL_PATH,
} from "./complaintConsumerEmail.cjs";
import { complaintPlazosResumenCorto } from "./complaintLegalCopy.cjs";

const payload = {
  tipo: "reclamo",
  nombres: "María Elena",
  apellidos: "García",
  dni: "12345678",
  domicilio: "Huancayo",
  telefono: "964052530",
  email: "maria@example.com",
  bienContratado: "Bota talla 38",
  monto: "250",
  numeroPedido: "ORD-9",
  detalle: "Suela despegada. Solicito cambio.<script>alert(1)</script>",
};

const codigo = "CV-LR-20260527-ABC123";
const submittedAt = "2026-05-27T15:30:00.000Z";

describe("complaintConsumerEmail", () => {
  it("asunto incluye código sanitizado", () => {
    expect(buildComplaintConsumerEmailSubject(codigo)).toContain("CV-LR-20260527-ABC123");
    expect(buildComplaintConsumerEmailSubject("x<script>")).not.toContain("<");
  });

  it("texto plano incluye plazos legales y no HTML crudo del detalle", () => {
    const text = buildComplaintConsumerEmailText(payload, codigo, submittedAt);
    expect(text).toContain(codigo);
    expect(text).toContain(complaintPlazosResumenCorto());
    expect(text).not.toContain("<script>");
    expect(text).not.toContain("Suela despegada");
  });

  it("HTML escapa contenido y enlaza página legal", () => {
    const prev = process.env.APP_URL;
    process.env.APP_URL = "https://ejemplo.test";
    try {
      const html = buildComplaintConsumerEmailHtml(payload, codigo, submittedAt);
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("Suela despegada");
      expect(html).toContain(`https://ejemplo.test${LIBRO_LEGAL_PATH}`);
      expect(html).toContain(codigo);
      expect(html).toContain("15");
      expect(html).toContain("30");
    } finally {
      process.env.APP_URL = prev;
    }
  });

  describe("isConsumerEmailEnabled", () => {
    let prev;

    beforeEach(() => {
      prev = process.env.COMPLAINT_CONSUMER_EMAIL_ENABLED;
    });

    afterEach(() => {
      process.env.COMPLAINT_CONSUMER_EMAIL_ENABLED = prev;
    });

    it("habilitado por defecto", () => {
      delete process.env.COMPLAINT_CONSUMER_EMAIL_ENABLED;
      expect(isConsumerEmailEnabled()).toBe(true);
    });

    it("respeta COMPLAINT_CONSUMER_EMAIL_ENABLED=false", () => {
      process.env.COMPLAINT_CONSUMER_EMAIL_ENABLED = "false";
      expect(isConsumerEmailEnabled()).toBe(false);
    });
  });
});

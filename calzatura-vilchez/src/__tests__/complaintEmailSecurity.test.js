import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { validateComplaintPayload } = require("../../bff/libroReclamaciones.cjs");
const {
  escapePlainText,
  parseEmailList,
  buildComplaintEmailText,
} = require("../../bff/complaintNotifyEmail.cjs");
const {
  buildComplaintConsumerEmailHtml,
  buildComplaintConsumerEmailText,
} = require("../../bff/complaintConsumerEmail.cjs");
const { isValidEmail, hasEmailControlChars } = require("../../bff/emailValidation.cjs");

const validBody = {
  tipo: "reclamo",
  nombres: "Juan",
  apellidos: "Pérez",
  dni: "12345678",
  domicilio: "Huancayo",
  telefono: "964052530",
  email: "juan.perez@gmail.com",
  bienContratado: "Zapatilla",
  monto: "199.90",
  detalle: "Detalle suficiente para el libro de reclamaciones.",
  aceptaPrivacidad: true,
};

function expectEmailRejected(email) {
  try {
    validateComplaintPayload({ ...validBody, email });
    expect.fail("debió rechazar el correo");
  } catch (err) {
    expect(err.fields?.email).toBeTruthy();
  }
}

describe("libro reclamaciones — correo frente a abusos", () => {
  it("acepta correo válido normalizado", () => {
    const payload = validateComplaintPayload({
      ...validBody,
      email: "  Juan.Perez@Gmail.COM ",
    });
    expect(payload.email).toBe("juan.perez@gmail.com");
  });

  it("rechaza inyección de cabeceras con salto de línea", () => {
    expectEmailRejected("victima@test.com\nBcc:atacante@evil.com");
    expect(hasEmailControlChars("a@b.com\n")).toBe(true);
  });

  it("rechaza correo sin TLD válido", () => {
    expectEmailRejected("usuario@dominio");
    expectEmailRejected("sin-arroba");
  });

  it("rechaza correo excesivamente largo", () => {
    expectEmailRejected(`${"a".repeat(95)}@test.com`);
  });

  it("parseEmailList ignora entradas inválidas o duplicadas", () => {
    expect(parseEmailList("ok@empresa.pe, bad, OK@empresa.pe , x@y")).toEqual(["ok@empresa.pe"]);
  });

  it("buildComplaintEmailText no incluye HTML del detalle", () => {
    const text = buildComplaintEmailText(
      {
        ...validBody,
        detalle: "<script>alert(1)</script>",
        email: "juan@empresa.pe",
      },
      "CV-LR-TEST",
    );
    expect(text).not.toContain("<script>");
    expect(text).toContain("‹script›");
  });

  it("escapePlainText elimina caracteres de control", () => {
    expect(escapePlainText("línea1\r\nlínea2")).not.toMatch(/\r|\n/);
  });

  it("isValidEmail rechaza null bytes", () => {
    expect(isValidEmail("user@test.com\u0000.evil.com")).toBe(false);
  });

  it("correo al consumidor no incluye detalle completo ni HTML sin escapar", () => {
    const body = {
      ...validBody,
      detalle: '<img src=x onerror="alert(1)">',
      bienContratado: "Zapato <b>test</b>",
    };
    const text = buildComplaintConsumerEmailText(body, "CV-LR-TEST", "2026-05-27T12:00:00.000Z");
    const html = buildComplaintConsumerEmailHtml(body, "CV-LR-TEST", "2026-05-27T12:00:00.000Z");
    expect(text).not.toContain("onerror");
    expect(text).not.toContain("<img");
    expect(html).not.toContain('onerror="alert');
    expect(html).toContain("‹b›");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain(body.detalle);
  });
});

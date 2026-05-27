"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  escapePlainText,
  parseEmailList,
  buildComplaintEmailText,
  loadComplaintNotifyRecipients,
} = require("./complaintNotifyEmail.cjs");

describe("complaintNotifyEmail", () => {
  it("escapePlainText elimina saltos y tags", () => {
    assert.equal(escapePlainText("a\nb<script>"), "a b‹script›");
  });

  it("parseEmailList valida y deduplica", () => {
    assert.deepEqual(parseEmailList(" A@b.com , invalid , a@b.com "), ["a@b.com"]);
  });

  it("buildComplaintEmailText incluye código", () => {
    const text = buildComplaintEmailText(
      {
        tipo: "reclamo",
        nombres: "Ana",
        apellidos: "López",
        dni: "12345678",
        domicilio: "Huancayo",
        telefono: "999888777",
        email: "ana@test.com",
        bienContratado: "Zapato",
        monto: "99",
        numeroPedido: "",
        detalle: "Detalle de prueba",
      },
      "CV-LR-20260526-ABC123",
    );
    assert.match(text, /CV-LR-20260526-ABC123/);
    assert.match(text, /ana@test.com/);
  });

  it("loadComplaintNotifyRecipients prioriza COMPLAINT_NOTIFY_EMAIL", () => {
    const prevNotify = process.env.COMPLAINT_NOTIFY_EMAIL;
    const prevSuper = process.env.SUPERADMIN_EMAILS;
    const prevFlag = process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN;
    try {
      process.env.COMPLAINT_NOTIFY_EMAIL = "reclamos@empresa.pe";
      process.env.SUPERADMIN_EMAILS = "admin@empresa.pe";
      process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN = "true";
      assert.deepEqual(loadComplaintNotifyRecipients(), ["reclamos@empresa.pe"]);
    } finally {
      process.env.COMPLAINT_NOTIFY_EMAIL = prevNotify;
      process.env.SUPERADMIN_EMAILS = prevSuper;
      process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN = prevFlag;
    }
  });
});

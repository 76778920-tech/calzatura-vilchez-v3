import { describe, it, expect } from "vitest";
import {
  escapePlainText,
  parseEmailList,
  buildComplaintEmailText,
  loadComplaintNotifyRecipients,
} from "./complaintNotifyEmail.cjs";

describe("complaintNotifyEmail", () => {
  it("escapePlainText elimina saltos y tags", () => {
    expect(escapePlainText("a\nb<script>")).toBe("a b‹script›");
  });

  it("parseEmailList valida y deduplica", () => {
    expect(parseEmailList(" A@b.com , invalid , a@b.com ")).toEqual(["a@b.com"]);
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
    expect(text).toMatch(/CV-LR-20260526-ABC123/);
    expect(text).toMatch(/ana@test.com/);
  });

  it("loadComplaintNotifyRecipients prioriza COMPLAINT_NOTIFY_EMAIL", () => {
    const prevNotify = process.env.COMPLAINT_NOTIFY_EMAIL;
    const prevSuper = process.env.SUPERADMIN_EMAILS;
    const prevFlag = process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN;
    try {
      process.env.COMPLAINT_NOTIFY_EMAIL = "reclamos@empresa.pe";
      process.env.SUPERADMIN_EMAILS = "admin@empresa.pe";
      process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN = "true";
      expect(loadComplaintNotifyRecipients()).toEqual(["reclamos@empresa.pe"]);
    } finally {
      process.env.COMPLAINT_NOTIFY_EMAIL = prevNotify;
      process.env.SUPERADMIN_EMAILS = prevSuper;
      process.env.COMPLAINT_NOTIFY_USE_SUPERADMIN = prevFlag;
    }
  });
});

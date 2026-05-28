import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const libroSource = read("bff/libroReclamaciones.cjs");
const consumerSource = read("bff/complaintConsumerEmail.cjs");
const notifySource = read("bff/complaintNotifyEmail.cjs");

describe("complaintConsumerEmail — integración y seguridad", () => {
  it("POST libro-reclamaciones dispara correo al consumidor tras insert", () => {
    const postBlock = libroSource.match(
      /app\.post\(["']\/libro-reclamaciones["'][\s\S]*?app\.get\(/,
    )?.[0];
    expect(postBlock).toContain("sendComplaintConsumerEmail");
    expect(postBlock).toContain("sendComplaintNotifyEmail");
  });

  it("correo consumidor no expone variables VITE_ ni lista interna", () => {
    expect(consumerSource).not.toMatch(/VITE_/);
    expect(consumerSource).not.toContain("COMPLAINT_NOTIFY_EMAIL");
    expect(consumerSource).not.toContain("loadComplaintNotifyRecipients");
  });

  it("usa transporte Resend compartido y validación de correo", () => {
    expect(consumerSource).toContain("complaintEmailResend.cjs");
    expect(consumerSource).toContain("isValidEmail");
    expect(consumerSource).toContain("buildComplaintConsumerEmailHtml");
    expect(notifySource).toContain("complaintEmailResend.cjs");
  });

  it("respuesta POST no filtra estado del envío de correo", () => {
    const postBlock = libroSource.match(
      /app\.post\(["']\/libro-reclamaciones["'][\s\S]*?app\.get\(/,
    )?.[0];
    expect(postBlock).not.toMatch(/emailSent|consumerEmail/);
  });
});

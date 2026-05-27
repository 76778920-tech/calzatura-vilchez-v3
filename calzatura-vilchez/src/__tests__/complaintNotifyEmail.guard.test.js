import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const notifySource = fs.readFileSync(
  path.resolve(process.cwd(), "bff/complaintNotifyEmail.cjs"),
  "utf8",
);
const libroSource = fs.readFileSync(
  path.resolve(process.cwd(), "bff/libroReclamaciones.cjs"),
  "utf8",
);

describe("complaint notify email — seguridad", () => {
  it("no usa variables VITE_ para correo de reclamos", () => {
    expect(notifySource).not.toMatch(/VITE_/);
    expect(libroSource).not.toContain("COMPLAINT_NOTIFY_EMAIL");
  });

  it("escapa texto plano y limita destinatarios", () => {
    expect(notifySource).toContain("escapePlainText");
    expect(notifySource).toContain("MAX_NOTIFY_RECIPIENTS");
    expect(notifySource).toContain("parseEmailList");
  });

  it("la respuesta POST no incluye datos del buzón interno", () => {
    const postBlock = libroSource.match(
      /app\.post\(["']\/libro-reclamaciones["'][\s\S]*?app\.get\(/,
    )?.[0];
    expect(postBlock).toBeTruthy();
    expect(postBlock).not.toContain("notifyEmail");
    expect(postBlock).not.toContain("COMPLAINT_NOTIFY");
  });
});

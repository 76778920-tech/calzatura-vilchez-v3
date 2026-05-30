import { describe, expect, it } from "vitest";
import {
  createWorkerNotificationsPollState,
  pollWorkerAuditEntries,
} from "./workerNotificationsPoll";

describe("workerNotificationsPoll", () => {
  const workerUids = new Set(["worker-1"]);

  it("en bootstrap incluye devolución reciente de trabajador", () => {
    const state = createWorkerNotificationsPollState();
    const entries = [
      {
        id: "a1",
        accion: "devolver_venta",
        entidad: "venta_diaria",
        entidadId: "sale-1",
        entidadNombre: "#ABC12345",
        detalle: null,
        usuarioUid: "worker-1",
        usuarioEmail: "tr***@test.com",
        realizadoEn: "2026-05-28T12:00:00.000Z",
      },
    ];

    const result = pollWorkerAuditEntries(entries, workerUids, state);
    expect(result.isBootstrap).toBe(true);
    expect(result.fresh).toHaveLength(1);
    expect(result.fresh[0]?.accion).toBe("devolver_venta");
  });

  it("no repite la misma entrada en el siguiente poll", () => {
    const state = createWorkerNotificationsPollState();
    const entry = {
      id: "a1",
      accion: "devolver_venta" as const,
      entidad: "venta_diaria" as const,
      entidadId: "sale-1",
      entidadNombre: "#ABC12345",
      detalle: null,
      usuarioUid: "worker-1",
      usuarioEmail: null,
      realizadoEn: "2026-05-28T12:00:00.000Z",
    };

    const first = pollWorkerAuditEntries([entry], workerUids, state);
    const second = pollWorkerAuditEntries([entry], workerUids, first.nextState);
    expect(second.fresh).toHaveLength(0);
  });

  it("ignora devolución hecha por admin", () => {
    const state = createWorkerNotificationsPollState();
    const entries = [
      {
        id: "a2",
        accion: "devolver_venta",
        entidad: "venta_diaria",
        entidadId: "sale-2",
        entidadNombre: "#ZZZZ9999",
        detalle: null,
        usuarioUid: "admin-9",
        usuarioEmail: null,
        realizadoEn: "2026-05-28T12:05:00.000Z",
      },
    ];

    const result = pollWorkerAuditEntries(entries, workerUids, state);
    expect(result.fresh).toHaveLength(0);
  });
});

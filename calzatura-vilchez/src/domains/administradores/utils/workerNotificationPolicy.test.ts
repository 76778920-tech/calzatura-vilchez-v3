import { describe, expect, it } from "vitest";
import {
  formatWorkerNotifToast,
  isWorkerAuditEntry,
  TRACKED_WORKER_ENTITIES,
} from "./workerNotificationPolicy";

describe("workerNotificationPolicy", () => {
  const workerUids = new Set(["worker-1"]);

  it("incluye venta_diaria además de venta", () => {
    expect(TRACKED_WORKER_ENTITIES.has("venta_diaria")).toBe(true);
    expect(TRACKED_WORKER_ENTITIES.has("venta")).toBe(true);
  });

  it("detecta venta_diaria de trabajador", () => {
    expect(
      isWorkerAuditEntry(
        { entidad: "venta_diaria", usuarioUid: "worker-1" },
        workerUids,
      ),
    ).toBe(true);
  });

  it("ignora acciones de admin", () => {
    expect(
      isWorkerAuditEntry(
        { entidad: "venta_diaria", usuarioUid: "admin-9" },
        workerUids,
      ),
    ).toBe(false);
  });

  it("formatea toast de registrar venta", () => {
    expect(
      formatWorkerNotifToast({
        accion: "registrar_venta",
        entidad: "venta_diaria",
        entidadNombre: "#ABC12345",
      }),
    ).toBe("Trabajador registró Venta: #ABC12345");
  });

  it("formatea toast de devolver venta", () => {
    expect(
      formatWorkerNotifToast({
        accion: "devolver_venta",
        entidad: "venta_diaria",
        entidadNombre: "#XYZ98765",
      }),
    ).toBe("Trabajador devolvió Venta: #XYZ98765");
  });
});

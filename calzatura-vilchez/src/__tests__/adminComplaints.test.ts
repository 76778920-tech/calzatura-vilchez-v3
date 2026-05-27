import { beforeEach, describe, expect, it, vi } from "vitest";

const { bffFetchMock } = vi.hoisted(() => ({
  bffFetchMock: vi.fn(),
}));

vi.mock("@/utils/bffClient", () => ({
  bffFetch: bffFetchMock,
}));

import {
  complaintPatchPath,
  complaintsListPath,
  fetchComplaints,
  updateComplaintStatus,
} from "@/domains/administradores/services/adminComplaints";

describe("adminComplaints", () => {
  beforeEach(() => {
    bffFetchMock.mockReset();
  });

  it("construye rutas admin y staff con filtro opcional", () => {
    expect(complaintsListPath("admin")).toBe("/admin/libro-reclamaciones");
    expect(complaintsListPath("staff", "en_tramite")).toBe(
      "/staff/libro-reclamaciones?estado=en_tramite",
    );
    expect(complaintPatchPath("admin", "CV-LR-1")).toBe(
      "/admin/libro-reclamaciones/CV-LR-1",
    );
  });

  it("lista reclamos del panel", async () => {
    bffFetchMock.mockResolvedValue({ complaints: [{ codigo: "CV-LR-1" }] });
    await expect(fetchComplaints("staff")).resolves.toEqual([{ codigo: "CV-LR-1" }]);
    expect(bffFetchMock).toHaveBeenCalledWith("/staff/libro-reclamaciones");
  });

  it("actualiza estado y notas", async () => {
    bffFetchMock.mockResolvedValue({
      complaint: { codigo: "CV-LR-2", estado: "respondido" },
    });
    await expect(
      updateComplaintStatus("admin", "CV-LR-2", {
        estado: "respondido",
        notasInternas: "Contactado por teléfono",
      }),
    ).resolves.toEqual({ codigo: "CV-LR-2", estado: "respondido" });
    expect(bffFetchMock).toHaveBeenCalledWith(
      "/admin/libro-reclamaciones/CV-LR-2",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/types";

const { bffFetchMock, logAuditMock, authState } = vi.hoisted(() => ({
  bffFetchMock: vi.fn(),
  logAuditMock: vi.fn(),
  authState: { uid: "user-1" as string | null },
}));

vi.mock("@/firebase/config", () => ({
  auth: {
    get currentUser() {
      return authState.uid ? { uid: authState.uid } : null;
    },
  },
}));

vi.mock("@/utils/bffClient", () => ({
  bffFetch: bffFetchMock,
}));

vi.mock("@/services/audit", () => ({
  logAudit: logAuditMock,
}));

import {
  deleteUserProfile,
  fetchAllUsers,
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
  updateUserRole,
} from "@/domains/usuarios/services/users";

const profile: UserProfile = {
  uid: "user-1",
  email: "a@test.com",
  nombre: "Ana",
  rol: "cliente",
  creadoEn: "2026-01-01T00:00:00.000Z",
  telefono: "",
  direcciones: [],
};

describe("users service", () => {
  beforeEach(() => {
    bffFetchMock.mockReset();
    logAuditMock.mockReset();
    authState.uid = "user-1";
  });

  it("guarda perfil del usuario autenticado", async () => {
    bffFetchMock.mockResolvedValue(undefined);
    await saveUserProfile(profile);
    expect(bffFetchMock).toHaveBeenCalledWith("/users/me", {
      method: "PUT",
      body: JSON.stringify({ profile }),
    });
  });

  it("rechaza guardar perfil ajeno", async () => {
    await expect(saveUserProfile({ ...profile, uid: "other" })).rejects.toThrow("No autorizado");
  });

  it("obtiene perfil propio o null si falla BFF", async () => {
    bffFetchMock.mockResolvedValueOnce({ profile });
    await expect(getUserProfile("user-1")).resolves.toEqual(profile);
    bffFetchMock.mockRejectedValueOnce(new Error("bff down"));
    await expect(getUserProfile("user-1")).resolves.toBeNull();
    await expect(getUserProfile("user-2")).resolves.toBeNull();
  });

  it("lista usuarios admin y actualiza rol con auditoría", async () => {
    bffFetchMock.mockResolvedValueOnce({ users: [profile] });
    await expect(fetchAllUsers()).resolves.toEqual([profile]);
    bffFetchMock.mockResolvedValueOnce(undefined);
    await updateUserRole("user-2", "admin");
    expect(logAuditMock).toHaveBeenCalledWith("cambiar_estado", "usuario", "user-2", "user-2", { rol: "admin" });
  });

  it("patch parcial y delete admin", async () => {
    bffFetchMock.mockResolvedValue(undefined);
    await updateUserProfile("user-1", { telefono: "999" });
    expect(bffFetchMock).toHaveBeenCalledWith("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ telefono: "999" }),
    });
    await deleteUserProfile("user-9");
    expect(bffFetchMock).toHaveBeenCalledWith("/admin/users/user-9", { method: "DELETE" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, getIdTokenMock, authState, getBackendApiBaseUrlMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getIdTokenMock: vi.fn(),
  authState: { user: null as null | { getIdToken: () => Promise<string> } },
  getBackendApiBaseUrlMock: vi.fn(() => "https://bff.test"),
}));

vi.mock("@/firebase/config", () => ({
  auth: {
    get currentUser() {
      return authState.user;
    },
  },
}));

vi.mock("@/config/apiBackend", () => ({
  getBackendApiBaseUrl: getBackendApiBaseUrlMock,
}));

import { bffFetch } from "@/utils/bffClient";

describe("bffFetch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getIdTokenMock.mockReset();
    authState.user = { getIdToken: getIdTokenMock.mockResolvedValue("token-1") };
    globalThis.fetch = fetchMock as typeof fetch;
  });

  it("envía Authorization y parsea JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [] }),
    });

    await expect(bffFetch("/myOrders")).resolves.toEqual({ orders: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.test/myOrders",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
  });

  it("sin sesión lanza error", async () => {
    authState.user = null;
    await expect(bffFetch("/myOrders")).rejects.toThrow(/iniciar sesion/i);
  });
});

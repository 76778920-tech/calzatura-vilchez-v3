import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, getBackendApiBaseUrlMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getBackendApiBaseUrlMock: vi.fn(() => "https://bff.test"),
}));

vi.mock("@/config/apiBackend", () => ({
  getBackendApiBaseUrl: getBackendApiBaseUrlMock,
}));

import { hasPublicBff, publicBffFetch } from "@/utils/publicBffClient";

describe("publicBffClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getBackendApiBaseUrlMock.mockReturnValue("https://bff.test");
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_E2E", "");
  });

  it("hasPublicBff false en E2E o sin base URL", () => {
    expect(hasPublicBff()).toBe(true);
    vi.stubEnv("VITE_E2E", "true");
    expect(hasPublicBff()).toBe(false);
    vi.stubEnv("VITE_E2E", "");
    getBackendApiBaseUrlMock.mockReturnValue("");
    expect(hasPublicBff()).toBe(false);
  });

  it("publicBffFetch parsea JSON y propaga errores HTTP", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [] }),
    });
    await expect(publicBffFetch("/public/catalog/browse")).resolves.toEqual({ products: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.test/public/catalog/browse",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) }),
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "servicio no disponible" }),
    });
    await expect(publicBffFetch("/public/catalog/browse")).rejects.toThrow("servicio no disponible");

    getBackendApiBaseUrlMock.mockReturnValue("");
    await expect(publicBffFetch("/x")).rejects.toThrow("BFF no configurado");
  });
});

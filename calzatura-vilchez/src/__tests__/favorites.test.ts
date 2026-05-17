import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addFavoriteProduct,
  fetchFavoriteProductIds,
  isProductFavorite,
  removeFavoriteProduct,
} from "@/domains/clientes/services/favorites";

const { fetchMock, getIdTokenMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getIdTokenMock: vi.fn().mockResolvedValue("token-1"),
}));

vi.mock("@/firebase/config", () => ({
  auth: {
    currentUser: {
      uid: "user-1",
      getIdToken: getIdTokenMock,
    },
  },
}));

vi.mock("@/config/apiBackend", () => ({
  getBackendApiBaseUrl: () => "https://bff.example",
}));

vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  vi.clearAllMocks();
});

describe("favorites service", () => {
  it("consulta favoritos via BFF", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ productIds: ["product-1", "product-2"] }),
    });

    await expect(fetchFavoriteProductIds("user-1")).resolves.toEqual(["product-1", "product-2"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.example/favorites",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      })
    );
  });

  it("bloquea consultas con un userId diferente al usuario actual", async () => {
    await expect(fetchFavoriteProductIds("user-2")).rejects.toThrow("otra cuenta");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el estado favorito por producto", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ isFavorite: true }),
    });

    await expect(isProductFavorite("user-1", "product-1")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.example/favorites?productId=product-1",
      expect.any(Object)
    );
  });

  it("agrega y elimina favoritos via BFF", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await addFavoriteProduct("user-1", "product-1");
    await removeFavoriteProduct("user-1", "product-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.example/favorites",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bff.example/favorites?productId=product-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addFavoriteProduct,
  fetchFavoriteProductIds,
  isProductFavorite,
  removeFavoriteProduct,
} from "@/domains/clientes/services/favorites";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((...path: unknown[]) => ({ kind: "collection", path })),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn((...path: unknown[]) => ({ kind: "doc", path })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn(),
}));

vi.mock("@/firebase/config", () => ({
  auth: {
    currentUser: {
      uid: "user-1",
    },
  },
  db: { kind: "firestore" },
}));

vi.mock("firebase/firestore", () => firestoreMocks);

afterEach(() => {
  vi.clearAllMocks();
});

describe("favorites service", () => {
  it("consulta solo favoritos de la cuenta autenticada", async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [{ id: "product-1" }, { id: "product-2" }],
    });

    await expect(fetchFavoriteProductIds("user-1")).resolves.toEqual(["product-1", "product-2"]);
    expect(firestoreMocks.collection).toHaveBeenCalledWith(
      { kind: "firestore" },
      "usuarios",
      "user-1",
      "favoritos"
    );
  });

  it("bloquea consultas con un userId diferente al usuario actual", async () => {
    await expect(fetchFavoriteProductIds("user-2")).rejects.toThrow("otra cuenta");
    expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
  });

  it("devuelve el estado favorito por producto", async () => {
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => true });

    await expect(isProductFavorite("user-1", "product-1")).resolves.toBe(true);
    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      { kind: "firestore" },
      "usuarios",
      "user-1",
      "favoritos",
      "product-1"
    );
  });

  it("agrega y elimina favoritos en la subcoleccion privada del usuario", async () => {
    await addFavoriteProduct("user-1", "product-1");
    await removeFavoriteProduct("user-1", "product-1");

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "doc" }),
      { productId: "product-1", creadoEn: "server-time" }
    );
    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "doc" })
    );
  });
});

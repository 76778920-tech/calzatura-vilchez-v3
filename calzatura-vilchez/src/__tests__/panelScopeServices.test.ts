import { describe, it, expect, vi, beforeEach } from "vitest";

const { bffFetchMock } = vi.hoisted(() => ({
  bffFetchMock: vi.fn(),
}));

vi.mock("@/utils/bffClient", () => ({
  bffFetch: bffFetchMock,
}));

vi.mock("@/firebase/config", () => ({
  auth: { currentUser: { uid: "u1" } },
}));

import { fetchAllOrders } from "@/domains/pedidos/services/orders";
import { fetchProductCodes, fetchProducts } from "@/domains/productos/services/products";

describe("panel scope BFF paths (ISO 27001)", () => {
  beforeEach(() => {
    bffFetchMock.mockReset();
    bffFetchMock.mockResolvedValue({ orders: [], products: [] });
  });

  it("fetchAllOrders admin usa /admin/orders", async () => {
    await fetchAllOrders("admin");
    expect(bffFetchMock).toHaveBeenCalledWith("/admin/orders");
  });

  it("fetchAllOrders staff usa /staff/orders", async () => {
    await fetchAllOrders("staff");
    expect(bffFetchMock).toHaveBeenCalledWith("/staff/orders");
  });

  it("fetchProducts admin usa /admin/products", async () => {
    await fetchProducts("admin");
    expect(bffFetchMock).toHaveBeenCalledWith("/admin/products");
  });

  it("fetchProducts staff usa /staff/products", async () => {
    await fetchProducts("staff");
    expect(bffFetchMock).toHaveBeenCalledWith("/staff/products");
  });

  it("fetchProductCodes admin usa /admin/productCodes", async () => {
    bffFetchMock.mockResolvedValue({ codes: {} });
    await fetchProductCodes("admin");
    expect(bffFetchMock).toHaveBeenCalledWith("/admin/productCodes");
  });

  it("fetchProductCodes staff usa /staff/productCodes", async () => {
    bffFetchMock.mockResolvedValue({ codes: {} });
    await fetchProductCodes("staff");
    expect(bffFetchMock).toHaveBeenCalledWith("/staff/productCodes");
  });
});

import type { Product, ProductFinancial, ProductPriceRange } from "@/types";

export type SaleProduct = Product & { codigo?: string; finanzas?: ProductFinancial | ProductPriceRange };

export type PendingSaleLine = {
  id: string;
  productId: string;
  color: string;
  talla: string;
  quantity: number;
  salePrice: number;
};

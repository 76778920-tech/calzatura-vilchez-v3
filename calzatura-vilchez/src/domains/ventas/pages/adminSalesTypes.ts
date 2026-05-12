import type { Product, ProductFinancial } from "@/types";

export type SaleProduct = Product & { codigo?: string; finanzas?: ProductFinancial };

export type PendingSaleLine = {
  id: string;
  productId: string;
  color: string;
  talla: string;
  quantity: number;
  salePrice: number;
};

import type { Address } from "@/types";

export function buildCheckoutAddressLine(d: Address): string {
  return [d.direccion, d.distrito, d.ciudad].map((s) => s.trim()).filter(Boolean).join(", ");
}

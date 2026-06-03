import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderAddressBlock } from "@/domains/pedidos/components/orderShared";
import type { Order } from "@/types";

const ORDER: Order = {
  id: "order-1",
  userId: "user-1",
  userEmail: "cliente@example.com",
  items: [],
  subtotal: 0,
  envio: 0,
  total: 0,
  estado: "pendiente",
  direccion: {
    nombre: "Maria",
    apellido: "Lopez",
    direccion: "Av. Real 123",
    ciudad: "Huancayo",
    distrito: "El Tambo",
    telefono: "999888777",
    referencia: "Frente al parque",
  },
  creadoEn: "2026-05-01T00:00:00.000Z",
  metodoPago: "contraentrega",
};

describe("OrderAddressBlock", () => {
  it("redacta PII cuando se usa en panel administrativo", () => {
    render(<OrderAddressBlock order={ORDER} redactPii />);

    expect(screen.getByText("M*** L***")).toBeInTheDocument();
    expect(screen.getByText("El Tambo")).toBeInTheDocument();
    expect(screen.getByText("Huancayo")).toBeInTheDocument();
    expect(screen.getByText("***8777")).toBeInTheDocument();
    expect(screen.queryByText("El Tambo, Huancayo")).not.toBeInTheDocument();
    expect(screen.queryByText(/Av\. Real 123/)).not.toBeInTheDocument();
    expect(screen.queryByText(/999888777/)).not.toBeInTheDocument();
  });

  it("mantiene direccion completa para el cliente viendo su propio pedido", () => {
    render(<OrderAddressBlock order={ORDER} />);

    expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    expect(screen.getByText("Av. Real 123")).toBeInTheDocument();
    expect(screen.getByText("El Tambo")).toBeInTheDocument();
    expect(screen.getByText("Huancayo")).toBeInTheDocument();
    expect(screen.getByText("999888777")).toBeInTheDocument();
    expect(screen.queryByText("Av. Real 123, El Tambo, Huancayo")).not.toBeInTheDocument();
  });

  it("muestra la ubicación marcada como enlace para administracion", () => {
    render(<OrderAddressBlock order={{
      ...ORDER,
      direccion: { ...ORDER.direccion, lat: -12.072948, lng: -75.207624 },
    }} />);

    expect(screen.getByText("Ubicación marcada por el cliente")).toBeInTheDocument();
    expect(screen.getByText("Pin de entrega confirmado en el mapa")).toBeInTheDocument();
    expect(screen.queryByText(/-12\.072948/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver en Google Maps/ })).toHaveAttribute(
      "href",
      "https://www.google.com/maps?q=-12.072948,-75.207624",
    );
  });
});

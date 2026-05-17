export interface Product {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  imagen: string;
  imagenes?: string[];
  stock: number;
  categoria: string;
  tipoCalzado?: string;
  tallas?: string[];
  tallaStock?: Record<string, number>;
  /**
   * Stock por color (clave = nombre del color en catálogo), cada valor es talla → cantidad.
   * Debe coincidir con `color` de la variante para checkout/BFF.
   */
  colorStock?: Record<string, Record<string, number>>;
  marca?: string;
  material?: string;
  estilo?: string;
  color?: string;
  /** Mismo valor en variantes de color del mismo modelo; si falta en datos viejos se usa `id` como clave. */
  familiaId?: string;
  destacado?: boolean;
  activo?: boolean;
  descuento?: 10 | 20 | 30;
  campana?: string;
}

export interface ProductFinancial {
  productId: string;
  costoCompra: number;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  precioMinimo: number;
  precioSugerido: number;
  precioMaximo: number;
  actualizadoEn: string;
}

export type SaleDocumentType = "ninguno" | "nota_venta" | "guia_remision";

export interface SaleCustomer {
  dni: string;
  nombres: string;
  apellidos: string;
}

export interface DailySale {
  id: string;
  productId: string;
  codigo: string;
  nombre: string;
  color?: string;
  talla?: string;
  fecha: string;
  cantidad: number;
  precioVenta: number;
  total: number;
  costoUnitario: number;
  costoTotal: number;
  ganancia: number;
  documentoTipo?: SaleDocumentType;
  documentoNumero?: string;
  cliente?: SaleCustomer;
  devuelto?: boolean;
  motivoDevolucion?: string;
  devueltoEn?: string;
  creadoEn: string;
  canal?: "tienda" | "web";
}

export interface ManufacturerDocument {
  id: string;
  tipo: "boleta" | "guia";
  nombre: string;
  imagen: string;
  observaciones?: string;
  creadoEn: string;
}

export interface Manufacturer {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  marca: string;
  telefono?: string;
  ultimoIngresoFecha?: string;
  ultimoIngresoMonto?: number;
  documentos?: ManufacturerDocument[];
  observaciones?: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  talla?: string;
  color?: string;
}

export interface Address {
  nombre: string;
  apellido: string;
  direccion: string;
  ciudad: string;
  distrito: string;
  telefono: string;
  referencia?: string;
}

export type OrderStatus =
  | "pendiente"
  | "pagado"
  | "enviado"
  | "entregado"
  | "cancelado";

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  subtotal: number;
  envio: number;
  total: number;
  estado: OrderStatus;
  direccion: Address;
  creadoEn: string;
  pagadoEn?: string;
  /** Contra entrega: marca server-side tras descontar stock en createOrder (o confirmCodOrder legacy). */
  stockDescontadoEn?: string;
  stripeSessionId?: string;
  metodoPago: string;
  notas?: string;
  idempotencyKey?: string;
}

export interface UserProfile {
  uid: string;
  dni?: string;
  nombres?: string;
  apellidos?: string;
  nombre: string;
  email: string;
  rol: UserRole;
  creadoEn: string;
  telefono?: string;
  direcciones?: Address[];
}

export type UserRole = "cliente" | "trabajador" | "admin";

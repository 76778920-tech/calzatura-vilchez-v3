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

/** Rangos de venta visibles para trabajador (sin costo de compra). */
export interface ProductPriceRange {
  productId: string;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  precioMinimo: number;
  precioSugerido: number;
  precioMaximo: number;
  actualizadoEn: string;
}

export interface ProductFinancial extends ProductPriceRange {
  costoCompra: number;
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
  costoUnitario?: number;
  costoTotal?: number;
  ganancia?: number;
  documentoTipo?: SaleDocumentType;
  documentoNumero?: string;
  cliente?: SaleCustomer;
  encargadoUid?: string;
  encargadoNombre?: string;
  encargadoEmail?: string;
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
  stockRestauradoEn?: string;
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

export type UserRole = "cliente" | "trabajador" | "psicologo" | "rrhh" | "admin";

export type HrAlertStatus = "pendiente_psicologo" | "evaluada" | "accion_rrhh" | "cerrada";
export type HrAlertType = "rendimiento_bajo" | "seguimiento" | "manual";
export type HrActionType =
  | "capacitacion"
  | "redistribucion_tareas"
  | "derivacion_formal"
  | "observacion"
  | "cerrar_seguimiento"
  | "continuar"
  | "no_continuar";

export interface WorkerDailySalesRow {
  fecha: string;
  pares: number;
  ventasTotal: number;
  transacciones: number;
}

export interface StaffNotification {
  id: string;
  destinatarioUid: string;
  tipo: "cita_psicologo" | "derivacion_rrhh" | "informe_disponible" | "decision_rrhh" | "general";
  titulo: string;
  mensaje: string;
  metadata: Record<string, unknown>;
  leida: boolean;
  creadoEn: string;
}

export interface PsychologyAppointment {
  id: string;
  alertaId: string;
  trabajadorUid: string;
  psicologoUid: string;
  psicologoEmail?: string;
  fechaCita: string;
  lugar: string;
  notas?: string;
  estado: "programada" | "realizada" | "cancelada";
  creadoEn: string;
  actualizadoEn?: string;
}

export interface WorkerMonthlyGoal {
  trabajadorUid: string;
  periodo: string;
  metaVentas: number;
  metaPedidos: number;
}

export interface StaffWorkflowSummary {
  alertaActiva: HrAlert | null;
  proximaCita: PsychologyAppointment | null;
}

export type StaffPerformancePayload = {
  performance: WorkerPerformanceMetrics;
  historialDiario: WorkerDailySalesRow[];
  notificaciones: StaffNotification[];
  citas: PsychologyAppointment[];
  workflow: StaffWorkflowSummary;
};

export interface WorkerPerformanceMetrics {
  trabajadorUid: string;
  trabajadorNombre: string;
  trabajadorEmail?: string;
  periodo: string;
  ventasCantidad: number;
  ventasTotal: number;
  gananciaTotal?: number;
  unidadesVendidas: number;
  pedidosGestionados: number;
  metaVentas: number;
  metaPedidos: number;
  cumplimientoVentas: number;
  cumplimientoPedidos: number;
  cumplimientoGeneral: number;
  feedback: string;
}

export interface HrAlert {
  id: string;
  trabajadorUid: string;
  trabajadorNombre: string;
  trabajadorEmail?: string;
  periodo: string;
  tipo: HrAlertType;
  motivoGeneral: string;
  estado: HrAlertStatus;
  metricas: WorkerPerformanceMetrics;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface PsychologicalReport {
  id: string;
  alertaId: string;
  trabajadorUid: string;
  periodo: string;
  psicologoUid: string;
  psicologoEmail?: string;
  resumen: string;
  recomendacion: string;
  pdfPath: string;
  pdfNombre: string;
  creadoEn: string;
}

export interface HrAction {
  id: string;
  alertaId: string;
  trabajadorUid: string;
  tipoAccion: HrActionType;
  descripcion: string;
  responsableUid: string;
  responsableEmail?: string;
  creadoEn: string;
}

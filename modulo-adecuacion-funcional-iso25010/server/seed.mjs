import { randomUUID } from "node:crypto";
import { MUST_RF_CATALOG } from "./mustRfCatalog.mjs";

export const SEED_EVALUACION_ID = "a1000000-0000-4000-8000-000000000001";
const uid = () => randomUUID();

export function buildSeedDb() {
  const now = new Date().toISOString();
  return {
    evaluaciones: [
      {
        id: SEED_EVALUACION_ID,
        codigo: "QC-AF-2026-Q2",
        titulo: "Evaluación Adecuación Funcional — Release junio 2026",
        sistema: "Sistema de Gestión de Calzados Calzatura Vilchez",
        periodo: "2026-Q2",
        evaluador: "Ing. Calidad — Tesis UCV",
        fecha_evaluacion: "2026-06-16",
        observaciones:
          "25 RF Must del SRS (manifest iso25000). Indicadores ISO/IEC 25010: CF, COF, TECP.",
        created_at: now,
        updated_at: now,
      },
    ],
    funciones: MUST_RF_CATALOG.map((rf) => ({
      id: uid(),
      evaluacion_id: SEED_EVALUACION_ID,
      codigo_rf: rf.codigo_rf,
      modulo: rf.modulo,
      nombre: rf.nombre,
      descripcion: rf.nombre,
      requerida: true,
      implementada: true,
      evidencia: rf.evidencia,
      created_at: now,
    })),
    transacciones: [
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-001", modulo: "Checkout", descripcion: "Pedido COD talla 42 — total S/ 189.90 con IGV correcto", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-002", modulo: "Carrito", descripcion: "Bloqueo cantidad > stock sandalia dama talla 37", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-003", modulo: "Admin", descripcion: "Código único CV-SEED-1 rechazado al duplicar", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-004", modulo: "Ventas", descripcion: "Venta tienda descuenta stock zapatilla hombre", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-005", modulo: "Checkout", descripcion: "Stripe webhook confirma pago y marca pedido pagado", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-006", modulo: "Admin", descripcion: "Margen mínimo bloqueado en producto outlet", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-007", modulo: "Pedidos", descripcion: "Restauración stock al cancelar pedido COD", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-008", modulo: "Libro reclamaciones", descripcion: "Registro hoja virtual Ley 29571", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-009", modulo: "Favoritos", descripcion: "Aislamiento favoritos entre usuarios", evaluada: true, correcta: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TX-COF-010", modulo: "IA", descripcion: "Predicción combined renderiza tabla admin", evaluada: true, correcta: true, observaciones: "", created_at: now },
    ],
    casos_prueba: [
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-IDON-001", nombre: "Flujo compra integrador", modulo: "Idoneidad", descripcion: "Catálogo → carrito → checkout COD → historial", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-PREC-001", nombre: "Stock carrito no excede disponible", modulo: "Precisión", descripcion: "Producto mock stock=3", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-SEG-001", nombre: "Rutas admin exigen login", modulo: "Seguridad", descripcion: "9 rutas /admin/* sin sesión", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-CMP-001", nombre: "Libro reclamaciones Ley 29571", modulo: "Cumplimiento", descripcion: "Página legal plazos 3/15 días", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-PROD-001", nombre: "Código duplicado bloqueado", modulo: "Admin productos", descripcion: "CV-SEED-1 activo", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-INT-002", nombre: "Stripe createCheckoutSession", modulo: "Interoperabilidad", descripcion: "Redirect checkout.stripe.com", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-DASH-004", nombre: "KPIs dashboard coherentes", modulo: "Admin dashboard", descripcion: "Mocks REST 2 productos", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-AUT-REG-001", nombre: "DNI inválido bloqueado", modulo: "Registro", descripcion: "Menos de 8 dígitos", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-ADM-STOCK-NEW", nombre: "Import Excel tallas EU/US", modulo: "Datos", descripcion: "Plantilla importación masiva", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
      { id: uid(), evaluacion_id: SEED_EVALUACION_ID, codigo: "TC-MOBILE-01", nombre: "Checkout responsive móvil", modulo: "UX móvil", descripcion: "Viewport 390px iPhone", ejecutado: true, aprobado: true, observaciones: "", created_at: now },
    ],
  };
}

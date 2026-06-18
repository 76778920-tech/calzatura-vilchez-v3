const API = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error de API");
  }
  return res.json() as Promise<T>;
}

export interface Evaluacion {
  id: string;
  codigo: string;
  titulo: string;
  sistema: string;
  periodo: string;
  evaluador: string;
  fecha_evaluacion: string;
  observaciones?: string;
}

export interface MetricBlock {
  pct: number | null;
  classification: { label: string; level: string };
}

export interface Metricas {
  completitud_funcional: MetricBlock & { funciones_requeridas: number; funciones_implementadas: number };
  correccion_funcional: MetricBlock & { transacciones_evaluadas: number; transacciones_correctas: number };
  tecp: MetricBlock & { casos_ejecutados: number; casos_aprobados: number };
  promedio_adecuacion: number | null;
  promedio_classification: { label: string; level: string };
}

export interface Funcion {
  id: string;
  evaluacion_id: string;
  codigo_rf: string;
  modulo: string;
  nombre: string;
  descripcion?: string;
  requerida: boolean;
  implementada: boolean;
  evidencia?: string;
}

export interface Transaccion {
  id: string;
  evaluacion_id: string;
  codigo: string;
  modulo: string;
  descripcion: string;
  evaluada: boolean;
  correcta: boolean | null;
  observaciones?: string;
}

export interface CasoPrueba {
  id: string;
  evaluacion_id: string;
  codigo: string;
  nombre: string;
  modulo: string;
  descripcion?: string;
  ejecutado: boolean;
  aprobado: boolean | null;
  observaciones?: string;
}

export interface EvaluacionDetalle extends Evaluacion {
  funciones: Funcion[];
  transacciones: Transaccion[];
  casos_prueba: CasoPrueba[];
  metricas: Metricas;
}

export const api = {
  listEvaluaciones: () => request<(Evaluacion & { metricas: Metricas })[]>("/evaluaciones"),
  getEvaluacion: (id: string) => request<EvaluacionDetalle>(`/evaluaciones/${id}`),
  createEvaluacion: (body: Partial<Evaluacion>) =>
    request<Evaluacion>("/evaluaciones", { method: "POST", body: JSON.stringify(body) }),
  saveFuncion: (evalId: string, body: Partial<Funcion>) =>
    request<Funcion>(`/evaluaciones/${evalId}/funciones`, { method: "POST", body: JSON.stringify(body) }),
  saveTransaccion: (evalId: string, body: Partial<Transaccion>) =>
    request<Transaccion>(`/evaluaciones/${evalId}/transacciones`, { method: "POST", body: JSON.stringify(body) }),
  saveCaso: (evalId: string, body: Partial<CasoPrueba>) =>
    request<CasoPrueba>(`/evaluaciones/${evalId}/casos-prueba`, { method: "POST", body: JSON.stringify(body) }),
  deleteFuncion: (id: string) => request(`/funciones/${id}`, { method: "DELETE" }),
  deleteTransaccion: (id: string) => request(`/transacciones/${id}`, { method: "DELETE" }),
  deleteCaso: (id: string) => request(`/casos-prueba/${id}`, { method: "DELETE" }),
  seed: () => request("/seed", { method: "POST" }),
  pdfUrl: (id: string) => `${API}/evaluaciones/${id}/reporte.pdf`,
};

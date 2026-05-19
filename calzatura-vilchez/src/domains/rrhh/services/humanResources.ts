import { supabase } from "@/supabase/client";
import { bffFetch } from "@/utils/bffClient";
import type {
  HrAction,
  HrActionType,
  HrAlert,
  PsychologicalReport,
  PsychologyAppointment,
  StaffPerformancePayload,
  WorkerDailySalesRow,
  WorkerPerformanceMetrics,
} from "@/types";

export type HrDashboardPayload = {
  period: string;
  workers: WorkerPerformanceMetrics[];
  alerts: HrAlert[];
  reports: PsychologicalReport[];
  actions: HrAction[];
  appointments: PsychologyAppointment[];
  goals: Array<{
    trabajadorUid: string;
    periodo: string;
    metaVentas: number;
    metaPedidos: number;
  }>;
};

export type PsychologyAlertsPayload = {
  period: string;
  alerts: HrAlert[];
  reports: PsychologicalReport[];
  appointments: PsychologyAppointment[];
};

export type WorkerHistoryPayload = {
  performance: WorkerPerformanceMetrics;
  historialDiario: WorkerDailySalesRow[];
};

export async function fetchStaffPerformance(period?: string): Promise<StaffPerformancePayload> {
  const qs = period ? `?periodo=${encodeURIComponent(period)}` : "";
  return bffFetch<StaffPerformancePayload>(`/staff/performance${qs}`);
}

export async function markStaffNotificationRead(notificationId: string): Promise<void> {
  await bffFetch(`/staff/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
  });
}

export async function markAllStaffNotificationsRead(): Promise<void> {
  await bffFetch("/staff/notifications/read-all", { method: "PATCH" });
}

export async function fetchHrDashboard(period?: string): Promise<HrDashboardPayload> {
  const qs = period ? `?periodo=${encodeURIComponent(period)}` : "";
  return bffFetch<HrDashboardPayload>(`/hr/dashboard${qs}`);
}

export async function fetchWorkerSalesHistory(
  workerUid: string,
  period: string,
): Promise<WorkerHistoryPayload> {
  const qs = `?periodo=${encodeURIComponent(period)}`;
  return bffFetch<WorkerHistoryPayload>(`/hr/workers/${encodeURIComponent(workerUid)}/history${qs}`);
}

export async function generateHrAlerts(period: string, threshold = 65): Promise<HrAlert[]> {
  const { alerts } = await bffFetch<{ alerts: HrAlert[] }>("/hr/alerts/generate", {
    method: "POST",
    body: JSON.stringify({ periodo: period, threshold }),
  });
  return alerts;
}

export async function referWorkerToPsychology(data: {
  trabajadorUid: string;
  periodo: string;
  motivoGeneral?: string;
}): Promise<HrAlert> {
  const { alert } = await bffFetch<{ alert: HrAlert }>("/hr/alerts/refer", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return alert;
}

export async function upsertWorkerGoal(data: {
  trabajadorUid: string;
  periodo: string;
  metaVentas: number;
  metaPedidos: number;
}): Promise<void> {
  await bffFetch("/hr/metas", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function createHrAction(data: {
  alertaId: string;
  tipoAccion: HrActionType;
  descripcion: string;
}): Promise<HrAction> {
  const { action } = await bffFetch<{ action: HrAction }>("/hr/actions", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return action;
}

export async function fetchPsychologyAlerts(period?: string): Promise<PsychologyAlertsPayload> {
  const qs = period ? `?periodo=${encodeURIComponent(period)}` : "";
  return bffFetch<PsychologyAlertsPayload>(`/psychology/alerts${qs}`);
}

export async function schedulePsychologyAppointment(data: {
  alertaId: string;
  fechaCita: string;
  lugar?: string;
  notas?: string;
}): Promise<PsychologyAppointment> {
  const { appointment } = await bffFetch<{ appointment: PsychologyAppointment }>("/psychology/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return appointment;
}

export async function updatePsychologyAppointment(
  appointmentId: string,
  estado: PsychologyAppointment["estado"],
): Promise<PsychologyAppointment> {
  const { appointment } = await bffFetch<{ appointment: PsychologyAppointment }>(
    `/psychology/appointments/${encodeURIComponent(appointmentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    },
  );
  return appointment;
}

export async function uploadPsychologyReportPdf(alertaId: string, file: File): Promise<{
  path: string;
  pdfNombre: string;
}> {
  const { path, token } = await bffFetch<{ path: string; token: string }>("/psychology/reports/upload-url", {
    method: "POST",
    body: JSON.stringify({
      alertaId,
      fileName: file.name,
      contentType: file.type || "application/pdf",
    }),
  });

  const { error } = await supabase.storage
    .from("rrhh-informes")
    .uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
  if (error) throw error;

  return { path, pdfNombre: file.name };
}

export async function createPsychologyReport(data: {
  alertaId: string;
  resumen: string;
  recomendacion: string;
  pdfPath: string;
  pdfNombre: string;
}): Promise<PsychologicalReport> {
  const { report } = await bffFetch<{ report: PsychologicalReport }>("/psychology/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return report;
}

export async function fetchHrReportDownloadUrl(reportId: string): Promise<string> {
  const { signedUrl } = await bffFetch<{ signedUrl: string }>(`/hr/reports/${encodeURIComponent(reportId)}/download-url`);
  return signedUrl;
}

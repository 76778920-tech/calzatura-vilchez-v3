import { supabase } from "@/supabase/client";
import { bffFetch } from "@/utils/bffClient";
import type { HrAction, HrActionType, HrAlert, PsychologicalReport, WorkerPerformanceMetrics } from "@/types";

export type HrDashboardPayload = {
  period: string;
  workers: WorkerPerformanceMetrics[];
  alerts: HrAlert[];
  reports: PsychologicalReport[];
  actions: HrAction[];
};

export type PsychologyAlertsPayload = {
  period: string;
  alerts: HrAlert[];
  reports: PsychologicalReport[];
};

export async function fetchStaffPerformance(period?: string): Promise<WorkerPerformanceMetrics> {
  const qs = period ? `?periodo=${encodeURIComponent(period)}` : "";
  const { performance } = await bffFetch<{ performance: WorkerPerformanceMetrics }>(`/staff/performance${qs}`);
  return performance;
}

export async function fetchHrDashboard(period?: string): Promise<HrDashboardPayload> {
  const qs = period ? `?periodo=${encodeURIComponent(period)}` : "";
  return bffFetch<HrDashboardPayload>(`/hr/dashboard${qs}`);
}

export async function generateHrAlerts(period: string, threshold = 65): Promise<HrAlert[]> {
  const { alerts } = await bffFetch<{ alerts: HrAlert[] }>("/hr/alerts/generate", {
    method: "POST",
    body: JSON.stringify({ periodo: period, threshold }),
  });
  return alerts;
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

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, Download, FileText, ShieldAlert, Target, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  createHrAction,
  fetchHrDashboard,
  fetchHrReportDownloadUrl,
  generateHrAlerts,
  type HrDashboardPayload,
} from "@/domains/rrhh/services/humanResources";
import type { HrActionType, HrAlert, PsychologicalReport, WorkerPerformanceMetrics } from "@/types";

function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function statusLabel(status: HrAlert["estado"]) {
  const labels: Record<HrAlert["estado"], string> = {
    pendiente_psicologo: "Pendiente psicólogo",
    evaluada: "Evaluada por psicólogo",
    accion_rrhh: "Con acción RR.HH.",
    cerrada: "Cerrada",
  };
  return labels[status];
}

function actionLabel(action: HrActionType) {
  const labels: Record<HrActionType, string> = {
    capacitacion: "Capacitación",
    redistribucion_tareas: "Redistribución de tareas",
    derivacion_formal: "Derivación formal",
    observacion: "Observación",
    cerrar_seguimiento: "Cerrar seguimiento",
  };
  return labels[action];
}

export default function HrDashboard() {
  const [period, setPeriod] = useState(currentPeriod);
  const [data, setData] = useState<HrDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [actionType, setActionType] = useState<HrActionType>("capacitacion");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reportsByAlert = useMemo(() => {
    return (data?.reports ?? []).reduce<Record<string, PsychologicalReport[]>>((acc, report) => {
      acc[report.alertaId] = [...(acc[report.alertaId] ?? []), report];
      return acc;
    }, {});
  }, [data?.reports]);

  const selectedAlert = (data?.alerts ?? []).find((alert) => alert.id === selectedAlertId) ?? data?.alerts[0] ?? null;

  const load = () => {
    setLoading(true);
    fetchHrDashboard(period)
      .then((payload) => {
        setData(payload);
        setSelectedAlertId((current) => current || payload.alerts[0]?.id || "");
      })
      .catch(() => {
        toast.error("No se pudo cargar RR.HH.");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    fetchHrDashboard(period)
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setSelectedAlertId(payload.alerts[0]?.id || "");
      })
      .catch(() => {
        if (!active) return;
        toast.error("No se pudo cargar RR.HH.");
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const summary = useMemo(() => {
    const workers = data?.workers ?? [];
    const alerts = data?.alerts ?? [];
    const reports = data?.reports ?? [];
    const avgPerformance = workers.length
      ? Math.round(workers.reduce((acc, item) => acc + item.cumplimientoGeneral, 0) / workers.length)
      : 0;
    return {
      workers: workers.length,
      alerts: alerts.length,
      reports: reports.length,
      avgPerformance,
    };
  }, [data]);

  const handleGenerateAlerts = async () => {
    setSaving(true);
    try {
      const generated = await generateHrAlerts(period);
      toast.success(`Alertas actualizadas: ${generated.length}`);
      load();
    } catch {
      toast.error("No se pudieron generar alertas");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAlert) {
      toast.error("Selecciona una alerta");
      return;
    }
    if (!description.trim()) {
      toast.error("Describe la acción tomada");
      return;
    }
    setSaving(true);
    try {
      await createHrAction({
        alertaId: selectedAlert.id,
        tipoAccion: actionType,
        descripcion: description,
      });
      toast.success("Acción registrada");
      setDescription("");
      load();
    } catch {
      toast.error("No se pudo registrar la acción");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const url = await fetchHrReportDownloadUrl(reportId);
      globalThis.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("No se pudo abrir el informe");
    }
  };

  return (
    <div className="hr-page">
      <section className="hr-hero">
        <div>
          <span><Building2 size={16} /> Recursos Humanos</span>
          <h1>Seguimiento de desempeño e informes</h1>
          <p>
            Vista integrada para revisar desempeño resumido, alertas derivadas, informes del psicólogo y acciones finales.
          </p>
        </div>
        <div className="hr-period-control">
          <label htmlFor="hr-period">Periodo</label>
          <input
            id="hr-period"
            className="form-input"
            type="month"
            value={period}
            onChange={(event) => {
              setLoading(true);
              setPeriod(event.target.value || currentPeriod());
            }}
          />
          <button type="button" className="btn-primary" onClick={handleGenerateAlerts} disabled={saving}>
            {saving ? "Procesando..." : "Generar alertas"}
          </button>
        </div>
      </section>

      <section className="staff-ops-grid" aria-label="Resumen de recursos humanos">
        <article className="staff-ops-card">
          <span className="staff-ops-icon"><Users size={22} /></span>
          <div><small>Trabajadores</small><strong>{summary.workers}</strong><p>Perfiles activos para seguimiento.</p></div>
        </article>
        <article className="staff-ops-card staff-ops-card-primary">
          <span className="staff-ops-icon"><ShieldAlert size={22} /></span>
          <div><small>Alertas</small><strong>{summary.alerts}</strong><p>Solicitudes o casos del periodo.</p></div>
        </article>
        <article className="staff-ops-card">
          <span className="staff-ops-icon staff-ops-icon-blue"><FileText size={22} /></span>
          <div><small>Informes PDF</small><strong>{summary.reports}</strong><p>Evaluaciones profesionales cargadas.</p></div>
        </article>
      </section>

      <section className="hr-panel-grid hr-panel-grid-wide">
        <article className="hr-panel-card">
          <div className="staff-section-heading">
            <div>
              <p>Indicadores clave</p>
              <h2>Rendimiento reciente</h2>
            </div>
            <span><Target size={14} /> Promedio {summary.avgPerformance}%</span>
          </div>
          <div className="hr-worker-list">
            {loading ? (
              <p className="staff-empty-state">Cargando trabajadores...</p>
            ) : (data?.workers ?? []).length === 0 ? (
              <p className="staff-empty-state">No hay trabajadores registrados.</p>
            ) : data?.workers.map((worker: WorkerPerformanceMetrics) => (
              <div key={worker.trabajadorUid} className="hr-worker-item">
                <div>
                  <strong>{worker.trabajadorNombre}</strong>
                  <span>{worker.trabajadorEmail}</span>
                </div>
                <div>
                  <small>Ventas</small>
                  <strong>{currency(worker.ventasTotal)}</strong>
                </div>
                <div>
                  <small>Pedidos</small>
                  <strong>{worker.pedidosGestionados}</strong>
                </div>
                <div>
                  <small>Meta</small>
                  <strong>{Math.round(worker.cumplimientoGeneral)}%</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="hr-panel-card">
          <div className="staff-section-heading">
            <div>
              <p>Historial de alertas</p>
              <h2>Casos derivados</h2>
            </div>
            <span>{data?.alerts.length ?? 0} caso(s)</span>
          </div>
          <div className="hr-alert-list">
            {(data?.alerts ?? []).length === 0 ? (
              <p className="staff-empty-state">No hay alertas para este periodo.</p>
            ) : data?.alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                className={`hr-alert-item ${selectedAlert?.id === alert.id ? "active" : ""}`}
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <span>{statusLabel(alert.estado)}</span>
                <strong>{alert.trabajadorNombre}</strong>
                <small>{alert.motivoGeneral}</small>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="hr-panel-grid">
        <article className="hr-panel-card">
          <div className="staff-section-heading">
            <div>
              <p>Informe del psicólogo</p>
              <h2>Evaluaciones cargadas</h2>
            </div>
            <FileText size={18} />
          </div>
          {selectedAlert ? (
            (reportsByAlert[selectedAlert.id] ?? []).length > 0 ? (
              <div className="hr-report-list">
                {reportsByAlert[selectedAlert.id].map((report) => (
                  <div key={report.id} className="hr-report-item">
                    <div>
                      <strong>{report.pdfNombre}</strong>
                      <span>{new Date(report.creadoEn).toLocaleDateString("es-PE")}</span>
                    </div>
                    <p>{report.resumen}</p>
                    <small>{report.recomendacion}</small>
                    <button type="button" className="btn-secondary" onClick={() => handleDownloadReport(report.id)}>
                      <Download size={15} /> Ver PDF
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="staff-empty-state">Aún no hay informe para esta alerta.</p>
            )
          ) : (
            <p className="staff-empty-state">Selecciona una alerta.</p>
          )}
        </article>

        <form className="hr-panel-card hr-form-card" onSubmit={handleSubmitAction}>
          <div className="staff-section-heading">
            <div>
              <p>Decisión final</p>
              <h2>Acción RR.HH.</h2>
            </div>
            <Building2 size={18} />
          </div>
          {selectedAlert ? (
            <>
              <div className="hr-selected-worker">
                <strong>{selectedAlert.trabajadorNombre}</strong>
                <span>{statusLabel(selectedAlert.estado)}</span>
              </div>
              <label>
                Tipo de acción
                <select className="form-input" value={actionType} onChange={(event) => setActionType(event.target.value as HrActionType)}>
                  {(["capacitacion", "redistribucion_tareas", "derivacion_formal", "observacion", "cerrar_seguimiento"] as HrActionType[]).map((option) => (
                    <option key={option} value={option}>{actionLabel(option)}</option>
                  ))}
                </select>
              </label>
              <label>
                Sustento o indicación
                <textarea className="form-input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando..." : "Registrar acción"}
              </button>
            </>
          ) : (
            <p className="staff-empty-state">Selecciona una alerta para registrar una decisión.</p>
          )}
        </form>
      </section>
    </div>
  );
}

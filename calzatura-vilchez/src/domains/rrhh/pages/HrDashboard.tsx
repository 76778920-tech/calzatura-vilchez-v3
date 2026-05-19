import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Download,
  FileText,
  Footprints,
  History,
  Send,
  ShieldAlert,
  Target,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import DailySalesHistoryTable from "@/domains/rrhh/components/DailySalesHistoryTable";
import {
  createHrAction,
  fetchHrDashboard,
  fetchHrReportDownloadUrl,
  fetchWorkerSalesHistory,
  generateHrAlerts,
  referWorkerToPsychology,
  upsertWorkerGoal,
  type HrDashboardPayload,
} from "@/domains/rrhh/services/humanResources";
import type { HrAction, HrActionType, HrAlert, PsychologicalReport, WorkerDailySalesRow, WorkerPerformanceMetrics } from "@/types";

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
    continuar: "Continúa en la empresa",
    no_continuar: "No continúa",
  };
  return labels[action];
}

export default function HrDashboard() {
  const [period, setPeriod] = useState(currentPeriod);
  const [data, setData] = useState<HrDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [actionType, setActionType] = useState<HrActionType>("continuar");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyWorker, setHistoryWorker] = useState<WorkerPerformanceMetrics | null>(null);
  const [historyRows, setHistoryRows] = useState<WorkerDailySalesRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [goalWorkerUid, setGoalWorkerUid] = useState("");
  const [metaVentas, setMetaVentas] = useState("3500");
  const [metaPedidos, setMetaPedidos] = useState("20");
  const [referMotivo, setReferMotivo] = useState("");

  const reportsByAlert = useMemo(() => {
    return (data?.reports ?? []).reduce<Record<string, PsychologicalReport[]>>((acc, report) => {
      acc[report.alertaId] = [...(acc[report.alertaId] ?? []), report];
      return acc;
    }, {});
  }, [data?.reports]);

  const actionsByAlert = useMemo(() => {
    return (data?.actions ?? []).reduce<Record<string, HrAction[]>>((acc, action) => {
      acc[action.alertaId] = [...(acc[action.alertaId] ?? []), action];
      return acc;
    }, {});
  }, [data?.actions]);

  const appointmentsByAlert = useMemo(() => {
    return (data?.appointments ?? []).reduce<Record<string, HrDashboardPayload["appointments"]>>((acc, cita) => {
      acc[cita.alertaId] = [...(acc[cita.alertaId] ?? []), cita];
      return acc;
    }, {});
  }, [data?.appointments]);

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
    load();
  }, [period]);

  const summary = useMemo(() => {
    const workers = data?.workers ?? [];
    const alerts = data?.alerts ?? [];
    const reports = data?.reports ?? [];
    const avgPerformance = workers.length
      ? Math.round(workers.reduce((acc, item) => acc + item.cumplimientoGeneral, 0) / workers.length)
      : 0;
    const totalPares = workers.reduce((acc, item) => acc + item.unidadesVendidas, 0);
    return { workers: workers.length, alerts: alerts.length, reports: reports.length, avgPerformance, totalPares };
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

  const handleReferWorker = async (worker: WorkerPerformanceMetrics) => {
    setSaving(true);
    try {
      await referWorkerToPsychology({
        trabajadorUid: worker.trabajadorUid,
        periodo: period,
        motivoGeneral: referMotivo.trim() || undefined,
      });
      toast.success(`${worker.trabajadorNombre} derivado al psicólogo`);
      setReferMotivo("");
      load();
    } catch {
      toast.error("No se pudo derivar al trabajador");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenHistory = async (worker: WorkerPerformanceMetrics) => {
    setHistoryWorker(worker);
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const result = await fetchWorkerSalesHistory(worker.trabajadorUid, period);
      setHistoryRows(result.historialDiario);
    } catch {
      toast.error("No se pudo cargar el historial");
      setHistoryWorker(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveGoal = async (event: FormEvent) => {
    event.preventDefault();
    if (!goalWorkerUid) {
      toast.error("Selecciona un trabajador");
      return;
    }
    setSaving(true);
    try {
      await upsertWorkerGoal({
        trabajadorUid: goalWorkerUid,
        periodo: period,
        metaVentas: Number(metaVentas),
        metaPedidos: Number(metaPedidos),
      });
      toast.success("Metas actualizadas");
      load();
    } catch {
      toast.error("No se pudieron guardar las metas");
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
      toast.error("Describe la acción o decisión");
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
            Pares vendidos por trabajador, derivación al psicólogo, citas, informes PDF y decisión de continuidad.
          </p>
        </div>
        <div className="hr-period-control">
          <label htmlFor="hr-period">Periodo</label>
          <input
            id="hr-period"
            className="form-input"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
          />
          <button type="button" className="btn-primary" onClick={handleGenerateAlerts} disabled={saving}>
            {saving ? "Procesando..." : "Generar alertas automáticas"}
          </button>
        </div>
      </section>

      <section className="staff-ops-grid staff-ops-grid-4" aria-label="Resumen de recursos humanos">
        <article className="staff-ops-card">
          <span className="staff-ops-icon"><Users size={22} /></span>
          <div><small>Trabajadores</small><strong>{summary.workers}</strong><p>En seguimiento este periodo.</p></div>
        </article>
        <article className="staff-ops-card">
          <span className="staff-ops-icon"><Footprints size={22} /></span>
          <div><small>Pares vendidos (equipo)</small><strong>{summary.totalPares}</strong><p>Suma de unidades del mes.</p></div>
        </article>
        <article className="staff-ops-card staff-ops-card-primary">
          <span className="staff-ops-icon"><ShieldAlert size={22} /></span>
          <div><small>Alertas activas</small><strong>{summary.alerts}</strong><p>Casos derivados o en curso.</p></div>
        </article>
        <article className="staff-ops-card">
          <span className="staff-ops-icon staff-ops-icon-blue"><FileText size={22} /></span>
          <div><small>Informes PDF</small><strong>{summary.reports}</strong><p>Evaluaciones del psicólogo.</p></div>
        </article>
      </section>

      <section className="hr-panel-grid hr-panel-grid-wide">
        <article className="hr-panel-card">
          <div className="staff-section-heading">
            <div>
              <p>Rendimiento por trabajador</p>
              <h2>Pares, ventas y metas</h2>
            </div>
            <span><Target size={14} /> Promedio {summary.avgPerformance}%</span>
          </div>
          <div className="hr-worker-list">
            {loading ? (
              <p className="staff-empty-state">Cargando trabajadores...</p>
            ) : (data?.workers ?? []).length === 0 ? (
              <p className="staff-empty-state">No hay trabajadores registrados.</p>
            ) : data?.workers.map((worker) => (
              <div key={worker.trabajadorUid} className="hr-worker-item hr-worker-item-extended">
                <div>
                  <strong>{worker.trabajadorNombre}</strong>
                  <span>{worker.trabajadorEmail}</span>
                </div>
                <div>
                  <small>Pares</small>
                  <strong>{worker.unidadesVendidas}</strong>
                </div>
                <div>
                  <small>Ventas</small>
                  <strong>{currency(worker.ventasTotal)}</strong>
                </div>
                <div>
                  <small>Cumplimiento</small>
                  <strong>{Math.round(worker.cumplimientoGeneral)}%</strong>
                </div>
                <div className="hr-worker-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handleOpenHistory(worker)}>
                    <History size={14} /> Historial
                  </button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handleReferWorker(worker)} disabled={saving}>
                    <Send size={14} /> Derivar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <label className="hr-refer-motivo">
            Motivo al derivar (opcional)
            <input
              className="form-input"
              value={referMotivo}
              onChange={(event) => setReferMotivo(event.target.value)}
              placeholder="Ej. bajo rendimiento sostenido en ventas"
            />
          </label>
        </article>

        <form className="hr-panel-card hr-form-card" onSubmit={handleSaveGoal}>
          <div className="staff-section-heading">
            <div>
              <p>Metas mensuales</p>
              <h2>Configurar objetivos</h2>
            </div>
          </div>
          <label>
            Trabajador
            <select className="form-input" value={goalWorkerUid} onChange={(event) => setGoalWorkerUid(event.target.value)}>
              <option value="">Seleccionar...</option>
              {(data?.workers ?? []).map((worker) => (
                <option key={worker.trabajadorUid} value={worker.trabajadorUid}>{worker.trabajadorNombre}</option>
              ))}
            </select>
          </label>
          <label>
            Meta ventas (S/)
            <input className="form-input" type="number" min={1} value={metaVentas} onChange={(event) => setMetaVentas(event.target.value)} />
          </label>
          <label>
            Meta pedidos
            <input className="form-input" type="number" min={1} value={metaPedidos} onChange={(event) => setMetaPedidos(event.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>Guardar metas</button>
        </form>
      </section>

      <section className="hr-panel-grid hr-panel-grid-wide">
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
                <span>{statusLabel(alert.estado)} · {alert.tipo.replaceAll("_", " ")}</span>
                <strong>{alert.trabajadorNombre}</strong>
                <small>{alert.motivoGeneral}</small>
                {(appointmentsByAlert[alert.id] ?? []).length > 0 && (
                  <em>Cita: {new Date(appointmentsByAlert[alert.id][0].fechaCita).toLocaleString("es-PE")}</em>
                )}
              </button>
            ))}
          </div>
        </article>

        <article className="hr-panel-card">
          <div className="staff-section-heading">
            <div>
              <p>Acciones registradas</p>
              <h2>Historial RR.HH.</h2>
            </div>
          </div>
          {selectedAlert ? (
            <div className="hr-action-history">
              {(actionsByAlert[selectedAlert.id] ?? []).length === 0 ? (
                <p className="staff-empty-state">Sin acciones para esta alerta.</p>
              ) : (actionsByAlert[selectedAlert.id] ?? []).map((action) => (
                <div key={action.id} className="hr-action-item">
                  <strong>{actionLabel(action.tipoAccion)}</strong>
                  <p>{action.descripcion}</p>
                  <small>{new Date(action.creadoEn).toLocaleString("es-PE")}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="staff-empty-state">Selecciona una alerta.</p>
          )}
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
              <h2>Continuidad en la empresa</h2>
            </div>
            <Building2 size={18} />
          </div>
          {selectedAlert ? (
            <>
              <div className="hr-selected-worker">
                <strong>{selectedAlert.trabajadorNombre}</strong>
                <span>{statusLabel(selectedAlert.estado)}</span>
              </div>
              <div className="hr-decision-buttons">
                <button
                  type="button"
                  className={`btn-secondary ${actionType === "continuar" ? "active" : ""}`}
                  onClick={() => setActionType("continuar")}
                >
                  Continúa
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${actionType === "no_continuar" ? "active" : ""}`}
                  onClick={() => setActionType("no_continuar")}
                >
                  No continúa
                </button>
              </div>
              <label>
                Otra acción
                <select className="form-input" value={actionType} onChange={(event) => setActionType(event.target.value as HrActionType)}>
                  {(["continuar", "no_continuar", "capacitacion", "redistribucion_tareas", "derivacion_formal", "observacion", "cerrar_seguimiento"] as HrActionType[]).map((option) => (
                    <option key={option} value={option}>{actionLabel(option)}</option>
                  ))}
                </select>
              </label>
              <label>
                Sustento o indicación
                <textarea className="form-input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando..." : "Registrar decisión"}
              </button>
            </>
          ) : (
            <p className="staff-empty-state">Selecciona una alerta para registrar la decisión.</p>
          )}
        </form>
      </section>

      {historyWorker && (
        <div className="hr-modal-backdrop" role="presentation" onClick={() => setHistoryWorker(null)}>
          <div className="hr-modal" role="dialog" aria-labelledby="history-title" onClick={(event) => event.stopPropagation()}>
            <div className="staff-section-heading">
              <div>
                <p>Historial de ventas</p>
                <h2 id="history-title">{historyWorker.trabajadorNombre}</h2>
              </div>
              <button type="button" className="btn-icon" aria-label="Cerrar" onClick={() => setHistoryWorker(null)}>
                <X size={18} />
              </button>
            </div>
            {historyLoading ? (
              <p className="staff-empty-state">Cargando historial...</p>
            ) : (
              <DailySalesHistoryTable rows={historyRows} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

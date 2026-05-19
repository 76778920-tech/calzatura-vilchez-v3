import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Brain, CalendarPlus, FileUp, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import {
  createPsychologyReport,
  fetchPsychologyAlerts,
  schedulePsychologyAppointment,
  updatePsychologyAppointment,
  uploadPsychologyReportPdf,
} from "@/domains/rrhh/services/humanResources";
import type { HrAlert, PsychologicalReport, PsychologyAppointment, WorkerPerformanceMetrics } from "@/types";

function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function statusLabel(status: HrAlert["estado"]) {
  const labels: Record<HrAlert["estado"], string> = {
    pendiente_psicologo: "Pendiente de evaluación",
    evaluada: "Evaluada",
    accion_rrhh: "Con acción RR.HH.",
    cerrada: "Cerrada",
  };
  return labels[status];
}

function currency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function PsychologyDashboard() {
  const [period, setPeriod] = useState(currentPeriod);
  const [alerts, setAlerts] = useState<HrAlert[]>([]);
  const [reports, setReports] = useState<PsychologicalReport[]>([]);
  const [appointments, setAppointments] = useState<PsychologyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [summary, setSummary] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fechaCita, setFechaCita] = useState("");
  const [lugar, setLugar] = useState("Consultorio / sala de evaluación");
  const [notasCita, setNotasCita] = useState("");
  const [saving, setSaving] = useState(false);

  const reportsByAlert = useMemo(() => {
    return reports.reduce<Record<string, PsychologicalReport>>((acc, report) => {
      acc[report.alertaId] = report;
      return acc;
    }, {});
  }, [reports]);

  const appointmentsByAlert = useMemo(() => {
    return appointments.reduce<Record<string, PsychologyAppointment[]>>((acc, cita) => {
      acc[cita.alertaId] = [...(acc[cita.alertaId] ?? []), cita];
      return acc;
    }, {});
  }, [appointments]);

  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0] ?? null;
  const selectedMetrics = (selectedAlert?.metricas ?? null) as WorkerPerformanceMetrics | null;

  const load = () => {
    setLoading(true);
    fetchPsychologyAlerts(period)
      .then((data) => {
        setAlerts(data.alerts);
        setReports(data.reports);
        setAppointments(data.appointments);
        setSelectedAlertId((current) => current || data.alerts[0]?.id || "");
      })
      .catch(() => {
        toast.error("No se pudieron cargar las solicitudes");
        setAlerts([]);
        setReports([]);
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [period]);

  const handleSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAlert) {
      toast.error("Selecciona una solicitud");
      return;
    }
    if (!fechaCita) {
      toast.error("Indica fecha y hora de la cita");
      return;
    }
    setSaving(true);
    try {
      await schedulePsychologyAppointment({
        alertaId: selectedAlert.id,
        fechaCita: new Date(fechaCita).toISOString(),
        lugar,
        notas: notasCita.trim() || undefined,
      });
      toast.success("Cita programada. El trabajador recibirá una notificación.");
      setFechaCita("");
      setNotasCita("");
      load();
    } catch {
      toast.error("No se pudo programar la cita");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAppointment = async (appointmentId: string, estado: PsychologyAppointment["estado"]) => {
    try {
      await updatePsychologyAppointment(appointmentId, estado);
      toast.success("Estado de cita actualizado");
      load();
    } catch {
      toast.error("No se pudo actualizar la cita");
    }
  };

  const handleSubmitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAlert) {
      toast.error("Selecciona una solicitud");
      return;
    }
    if (!file || file.type !== "application/pdf") {
      toast.error("Sube un PDF válido");
      return;
    }
    if (!summary.trim() || !recommendation.trim()) {
      toast.error("Completa el resumen y la recomendación");
      return;
    }

    setSaving(true);
    try {
      const upload = await uploadPsychologyReportPdf(selectedAlert.id, file);
      await createPsychologyReport({
        alertaId: selectedAlert.id,
        resumen: summary,
        recomendacion: recommendation,
        pdfPath: upload.path,
        pdfNombre: upload.pdfNombre,
      });
      toast.success("Informe registrado para RR.HH.");
      setSummary("");
      setRecommendation("");
      setFile(null);
      load();
    } catch {
      toast.error("No se pudo registrar el informe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-page">
      <section className="hr-hero">
        <div>
          <span><Brain size={16} /> Panel Psicólogo</span>
          <h1>Evaluación profesional y citas</h1>
          <p>
            Programa la cita (el trabajador recibe aviso en su panel), realiza la entrevista fuera de la app y sube el informe PDF.
          </p>
        </div>
        <div className="hr-period-control">
          <label htmlFor="psychology-period">Periodo</label>
          <input
            id="psychology-period"
            className="form-input"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
          />
        </div>
      </section>

      <section className="hr-panel-grid hr-panel-grid-wide">
        <article className="hr-panel-card">
          <div className="staff-section-heading">
            <div>
              <p>Solicitudes derivadas</p>
              <h2>Alertas del periodo</h2>
            </div>
            <span>{alerts.length} alerta(s)</span>
          </div>
          <div className="hr-alert-list">
            {loading ? (
              <p className="staff-empty-state">Cargando solicitudes...</p>
            ) : alerts.length === 0 ? (
              <p className="staff-empty-state">No hay solicitudes para este periodo.</p>
            ) : alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                className={`hr-alert-item ${selectedAlert?.id === alert.id ? "active" : ""}`}
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <span><ShieldAlert size={16} /> {statusLabel(alert.estado)}</span>
                <strong>{alert.trabajadorNombre}</strong>
                <small>{alert.motivoGeneral}</small>
                {reportsByAlert[alert.id] && <em>Informe registrado</em>}
              </button>
            ))}
          </div>
        </article>

        {selectedAlert && selectedMetrics && (
          <article className="hr-panel-card">
            <div className="staff-section-heading">
              <div>
                <p>Contexto operativo (RR.HH.)</p>
                <h2>Métricas del trabajador</h2>
              </div>
            </div>
            <div className="hr-metrics-snapshot">
              <div><small>Pares vendidos</small><strong>{selectedMetrics.unidadesVendidas}</strong></div>
              <div><small>Ventas</small><strong>{currency(selectedMetrics.ventasTotal)}</strong></div>
              <div><small>Pedidos</small><strong>{selectedMetrics.pedidosGestionados}</strong></div>
              <div><small>Cumplimiento</small><strong>{Math.round(selectedMetrics.cumplimientoGeneral)}%</strong></div>
            </div>
          </article>
        )}
      </section>

      {selectedAlert && (
        <section className="hr-panel-grid">
          <form className="hr-panel-card hr-form-card" onSubmit={handleSchedule}>
            <div className="staff-section-heading">
              <div>
                <p>Coordinación</p>
                <h2>Programar cita</h2>
              </div>
              <CalendarPlus size={18} />
            </div>
            <p className="hr-form-hint">
              No hay llamadas en la app: al guardar, el trabajador ve la fecha en Desempeño y en notificaciones.
            </p>
            <div className="hr-selected-worker">
              <strong>{selectedAlert.trabajadorNombre}</strong>
              <span>{selectedAlert.trabajadorEmail}</span>
            </div>
            <label>
              Fecha y hora
              <input
                className="form-input"
                type="datetime-local"
                value={fechaCita}
                onChange={(event) => setFechaCita(event.target.value)}
                required
              />
            </label>
            <label>
              Lugar
              <input className="form-input" value={lugar} onChange={(event) => setLugar(event.target.value)} />
            </label>
            <label>
              Notas para el trabajador (opcional)
              <textarea className="form-input" rows={2} value={notasCita} onChange={(event) => setNotasCita(event.target.value)} />
            </label>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Notificar cita al trabajador"}
            </button>
            {(appointmentsByAlert[selectedAlert.id] ?? []).length > 0 && (
              <div className="hr-appointment-list">
                {(appointmentsByAlert[selectedAlert.id] ?? []).map((cita) => (
                  <div key={cita.id} className="hr-appointment-item">
                    <div>
                      <strong>{new Date(cita.fechaCita).toLocaleString("es-PE")}</strong>
                      <span>{cita.lugar} · {cita.estado}</span>
                    </div>
                    {cita.estado === "programada" && (
                      <div className="hr-inline-actions">
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarkAppointment(cita.id, "realizada")}>
                          Marcar realizada
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarkAppointment(cita.id, "cancelada")}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </form>

          <form className="hr-panel-card hr-form-card" onSubmit={handleSubmitReport}>
            <div className="staff-section-heading">
              <div>
                <p>Evaluación profesional</p>
                <h2>Registrar informe PDF</h2>
              </div>
              <FileUp size={18} />
            </div>
            <label>
              Resumen profesional
              <textarea className="form-input" value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} />
            </label>
            <label>
              Recomendación para RR.HH.
              <textarea className="form-input" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} rows={4} />
            </label>
            <label>
              Informe PDF
              <input
                className="form-input"
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Registrando..." : "Subir informe para RR.HH."}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

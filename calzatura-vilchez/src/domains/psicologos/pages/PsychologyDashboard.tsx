import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Brain, FileUp, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { createPsychologyReport, fetchPsychologyAlerts, uploadPsychologyReportPdf } from "@/domains/rrhh/services/humanResources";
import type { HrAlert, PsychologicalReport } from "@/types";

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

export default function PsychologyDashboard() {
  const [period, setPeriod] = useState(currentPeriod);
  const [alerts, setAlerts] = useState<HrAlert[]>([]);
  const [reports, setReports] = useState<PsychologicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [summary, setSummary] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reportsByAlert = useMemo(() => {
    return reports.reduce<Record<string, PsychologicalReport>>((acc, report) => {
      acc[report.alertaId] = report;
      return acc;
    }, {});
  }, [reports]);

  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0] ?? null;

  const load = () => {
    setLoading(true);
    fetchPsychologyAlerts(period)
      .then((data) => {
        setAlerts(data.alerts);
        setReports(data.reports);
        setSelectedAlertId((current) => current || data.alerts[0]?.id || "");
      })
      .catch(() => {
        toast.error("No se pudieron cargar las solicitudes");
        setAlerts([]);
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    fetchPsychologyAlerts(period)
      .then((data) => {
        if (!active) return;
        setAlerts(data.alerts);
        setReports(data.reports);
        setSelectedAlertId(data.alerts[0]?.id || "");
      })
      .catch(() => {
        if (!active) return;
        toast.error("No se pudieron cargar las solicitudes");
        setAlerts([]);
        setReports([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const handleSubmit = async (event: FormEvent) => {
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
          <h1>Solicitudes de evaluación profesional</h1>
          <p>
            Solo se muestran alertas derivadas por RR.HH. con contexto mínimo. El informe detallado queda disponible para RR.HH.
          </p>
        </div>
        <div className="hr-period-control">
          <label htmlFor="psychology-period">Periodo</label>
          <input
            id="psychology-period"
            className="form-input"
            type="month"
            value={period}
            onChange={(event) => {
              setLoading(true);
              setPeriod(event.target.value || currentPeriod());
            }}
          />
        </div>
      </section>

      <section className="hr-panel-grid">
        <div className="hr-panel-card">
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
        </div>

        <form className="hr-panel-card hr-form-card" onSubmit={handleSubmit}>
          <div className="staff-section-heading">
            <div>
              <p>Evaluación profesional</p>
              <h2>Registrar informe</h2>
            </div>
            <FileUp size={18} />
          </div>
          {selectedAlert ? (
            <>
              <div className="hr-selected-worker">
                <strong>{selectedAlert.trabajadorNombre}</strong>
                <span>{selectedAlert.periodo} · {selectedAlert.tipo.replaceAll("_", " ")}</span>
              </div>
              <label>
                Resumen profesional
                <textarea className="form-input" value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} />
              </label>
              <label>
                Recomendación
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
            </>
          ) : (
            <p className="staff-empty-state">Selecciona una solicitud para registrar el informe.</p>
          )}
        </form>
      </section>
    </div>
  );
}

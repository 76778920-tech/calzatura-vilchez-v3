import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import {
  fetchComplaints,
  updateComplaintStatus,
  type ComplaintEstado,
} from "@/domains/administradores/services/adminComplaints";
import type { ComplaintRecord } from "@/domains/publico/services/libroReclamaciones";
import { panelFetchScopeForRole } from "@/security/accessControl";
import type { PanelFetchScope } from "@/security/panelScope";
import toast from "react-hot-toast";

const ESTADOS: ComplaintEstado[] = ["recibido", "en_tramite", "respondido", "cerrado"];

const ESTADO_LABEL: Record<ComplaintEstado, string> = {
  recibido: "Recibido",
  en_tramite: "En trámite",
  respondido: "Respondido",
  cerrado: "Cerrado",
};

const ESTADO_COLOR: Record<ComplaintEstado, string> = {
  recibido: "#f59e0b",
  en_tramite: "#3b82f6",
  respondido: "#10b981",
  cerrado: "#6b7280",
};

const SKELETON_KEYS = ["c1", "c2", "c3", "c4"] as const;

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminComplaints() {
  const { user, userProfile } = useAuth();
  const panelScope: PanelFetchScope = panelFetchScopeForRole(
    userProfile?.rol,
    user?.email ?? userProfile?.email,
  );
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingCodigo, setSavingCodigo] = useState<string | null>(null);
  const [notasDraft, setNotasDraft] = useState<Record<string, string>>({});

  const load = useCallback(
    (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      setLoadError(null);
      const estadoFilter =
        filterEstado === "todos" ? undefined : (filterEstado as ComplaintEstado);
      fetchComplaints(panelScope, estadoFilter)
        .then((rows) => {
          setComplaints(rows);
          setNotasDraft((prev) => {
            const next = { ...prev };
            for (const row of rows) {
              if (next[row.codigo] === undefined) {
                next[row.codigo] = row.notasInternas ?? "";
              }
            }
            return next;
          });
        })
        .catch(() => {
          setComplaints([]);
          setLoadError("No pudimos cargar el libro de reclamaciones.");
        })
        .finally(() => setLoading(false));
    },
    [panelScope, filterEstado],
  );

  useEffect(() => {
    const timer = globalThis.setTimeout(() => load(true), 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  const handleEstadoChange = async (codigo: string, estado: ComplaintEstado) => {
    setSavingCodigo(codigo);
    try {
      const updated = await updateComplaintStatus(panelScope, codigo, { estado });
      setComplaints((prev) => prev.map((c) => (c.codigo === codigo ? { ...c, ...updated } : c)));
      toast.success("Estado actualizado");
    } catch {
      toast.error("No se pudo actualizar el estado");
    } finally {
      setSavingCodigo(null);
    }
  };

  const handleSaveNotas = async (codigo: string) => {
    setSavingCodigo(codigo);
    try {
      const notasInternas = notasDraft[codigo]?.trim() || null;
      const updated = await updateComplaintStatus(panelScope, codigo, { notasInternas });
      setComplaints((prev) => prev.map((c) => (c.codigo === codigo ? { ...c, ...updated } : c)));
      toast.success("Notas guardadas");
    } catch {
      toast.error("No se pudieron guardar las notas");
    } finally {
      setSavingCodigo(null);
    }
  };

  return (
    <div className="admin-page admin-complaints">
      <div className="admin-toolbar">
        <label className="admin-filter">
          <span>Estado</span>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-ghost admin-refresh-btn" onClick={() => load(true)}>
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {loadError ? (
        <div className="admin-error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="admin-skeleton-list">
          {SKELETON_KEYS.map((k) => (
            <div key={k} className="admin-skeleton-row" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <p className="admin-empty">No hay hojas registradas con el filtro seleccionado.</p>
      ) : (
        <div className="admin-complaints-list">
          {complaints.map((row) => {
            const isOpen = expanded === row.codigo;
            const estado = row.estado as ComplaintEstado;
            return (
              <article key={row.codigo} className="admin-complaint-card">
                <header className="admin-complaint-header">
                  <div>
                    <strong>{row.codigo}</strong>
                    <span className="admin-complaint-meta">
                      {row.tipo === "reclamo" ? "Reclamo" : "Queja"} · {formatFecha(row.creadoEn)} ·{" "}
                      {row.canal}
                    </span>
                    <span className="admin-complaint-consumer">
                      {row.nombres} {row.apellidos} · DNI {row.dni}
                    </span>
                  </div>
                  <span
                    className="admin-status-pill"
                    style={{ backgroundColor: ESTADO_COLOR[estado] ?? "#6b7280" }}
                  >
                    {ESTADO_LABEL[estado] ?? row.estado}
                  </span>
                  <button
                    type="button"
                    className="admin-expand-btn"
                    onClick={() => setExpanded(isOpen ? null : row.codigo)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </header>
                {isOpen ? (
                  <div className="admin-complaint-body">
                    <p>
                      <strong>Contacto:</strong> {row.email} · {row.telefono}
                    </p>
                    <p>
                      <strong>Domicilio:</strong> {row.domicilio}
                    </p>
                    <p>
                      <strong>Bien:</strong> {row.bienContratado}
                      {row.monto ? ` · S/ ${row.monto}` : ""}
                      {row.numeroPedido ? ` · Pedido ${row.numeroPedido}` : ""}
                    </p>
                    <p>
                      <strong>Detalle:</strong> {row.detalle}
                    </p>
                    <div className="admin-complaint-actions">
                      <label>
                        Estado
                        <select
                          value={estado}
                          disabled={savingCodigo === row.codigo}
                          onChange={(e) =>
                            handleEstadoChange(row.codigo, e.target.value as ComplaintEstado)
                          }
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_LABEL[e]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-group">
                      <label htmlFor={`notas-${row.codigo}`}>Notas internas</label>
                      <textarea
                        id={`notas-${row.codigo}`}
                        className="form-input"
                        rows={3}
                        value={notasDraft[row.codigo] ?? ""}
                        onChange={(e) =>
                          setNotasDraft((prev) => ({ ...prev, [row.codigo]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={savingCodigo === row.codigo}
                        onClick={() => handleSaveNotas(row.codigo)}
                      >
                        Guardar notas
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

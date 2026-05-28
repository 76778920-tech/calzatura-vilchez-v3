import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import {
  createComplaintFromPanel,
  fetchComplaints,
  updateComplaintStatus,
  type ComplaintEstado,
  type PanelComplaintCreateInput,
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

const NEW_FORM_INITIAL: PanelComplaintCreateInput = {
  tipo: "reclamo",
  canal: "tienda",
  nombres: "",
  apellidos: "",
  dni: "",
  domicilio: "",
  telefono: "",
  email: "",
  bienContratado: "",
  monto: "",
  numeroPedido: "",
  detalle: "",
};

type ComplaintsMainViewParams = Readonly<{
  loading: boolean;
  complaints: ComplaintRecord[];
  expanded: string | null;
  setExpanded: (codigo: string | null) => void;
  savingCodigo: string | null;
  notasDraft: Record<string, string>;
  setNotasDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onEstadoChange: (codigo: string, estado: ComplaintEstado) => Promise<void>;
  onSaveNotas: (codigo: string) => Promise<void>;
}>;

function renderComplaintsMain({
  loading,
  complaints,
  expanded,
  setExpanded,
  savingCodigo,
  notasDraft,
  setNotasDraft,
  onEstadoChange,
  onSaveNotas,
}: ComplaintsMainViewParams): ReactNode {
  if (loading) {
    return (
      <div className="admin-skeleton-list">
        {SKELETON_KEYS.map((k) => (
          <div key={k} className="admin-skeleton-row" />
        ))}
      </div>
    );
  }
  if (complaints.length === 0) {
    return <p className="admin-empty">No hay hojas registradas con el filtro seleccionado.</p>;
  }
  return (
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
                  <label className="admin-field-label">
                    <span className="admin-field-label-text">Estado</span>
                    <select
                      value={estado}
                      disabled={savingCodigo === row.codigo}
                      onChange={(e) =>
                        onEstadoChange(row.codigo, e.target.value as ComplaintEstado)
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
                    onClick={() => onSaveNotas(row.codigo)}
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
  );
}

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
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [creatingComplaint, setCreatingComplaint] = useState(false);
  const [newComplaint, setNewComplaint] = useState<PanelComplaintCreateInput>(NEW_FORM_INITIAL);

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
              next[row.codigo] ??= row.notasInternas ?? "";
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

  const createComplaint = async () => {
    setCreatingComplaint(true);
    try {
      const payload = {
        ...newComplaint,
        dni: newComplaint.dni.replace(/\D/g, "").slice(0, 8),
      };
      const created = await createComplaintFromPanel(panelScope, payload);
      setComplaints((prev) => [created, ...prev]);
      setExpanded(created.codigo);
      setNotasDraft((prev) => ({ ...prev, [created.codigo]: created.notasInternas ?? "" }));
      setNewComplaint(NEW_FORM_INITIAL);
      setNewFormOpen(false);
      toast.success("Hoja registrada en el libro virtual");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la hoja");
    } finally {
      setCreatingComplaint(false);
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
        <button type="button" className="btn-primary" onClick={() => setNewFormOpen((v) => !v)}>
          {newFormOpen ? "Cerrar registro" : "Registrar hoja (tienda/WhatsApp)"}
        </button>
      </div>

      {newFormOpen ? (
        <form
          className="complaint-book-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createComplaint();
          }}
        >
          <p className="complaint-book-form-lead">
            Registra una hoja recibida por canal presencial o WhatsApp. Se guarda en el mismo libro
            virtual y genera código.
          </p>
          <div className="complaint-book-grid complaint-book-grid--two">
            <label className="form-group">
              <span>Tipo</span>
              <select
                className="form-input"
                value={newComplaint.tipo}
                onChange={(e) =>
                  setNewComplaint((prev) => ({ ...prev, tipo: e.target.value as "reclamo" | "queja" }))
                }
              >
                <option value="reclamo">Reclamo</option>
                <option value="queja">Queja</option>
              </select>
            </label>
            <label className="form-group">
              <span>Canal</span>
              <select
                className="form-input"
                value={newComplaint.canal}
                onChange={(e) =>
                  setNewComplaint((prev) => ({
                    ...prev,
                    canal: e.target.value as "tienda" | "whatsapp",
                  }))
                }
              >
                <option value="tienda">Tienda</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label className="form-group">
              <span>Nombres</span>
              <input
                className="form-input"
                value={newComplaint.nombres}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, nombres: e.target.value }))}
                required
              />
            </label>
            <label className="form-group">
              <span>Apellidos</span>
              <input
                className="form-input"
                value={newComplaint.apellidos}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, apellidos: e.target.value }))}
                required
              />
            </label>
            <label className="form-group">
              <span>DNI</span>
              <input
                className="form-input"
                value={newComplaint.dni}
                onChange={(e) =>
                  setNewComplaint((prev) => ({
                    ...prev,
                    dni: e.target.value.replace(/\D/g, "").slice(0, 8),
                  }))
                }
                inputMode="numeric"
                pattern="\d{8}"
                required
              />
            </label>
            <label className="form-group">
              <span>Teléfono</span>
              <input
                className="form-input"
                value={newComplaint.telefono}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, telefono: e.target.value }))}
                required
              />
            </label>
            <label className="form-group complaint-book-grid-full">
              <span>Domicilio</span>
              <input
                className="form-input"
                value={newComplaint.domicilio}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, domicilio: e.target.value }))}
                required
              />
            </label>
            <label className="form-group">
              <span>Correo</span>
              <input
                className="form-input"
                type="email"
                value={newComplaint.email}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label className="form-group">
              <span>N. pedido (opcional)</span>
              <input
                className="form-input"
                value={newComplaint.numeroPedido}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, numeroPedido: e.target.value }))}
              />
            </label>
            <label className="form-group">
              <span>Bien/servicio</span>
              <input
                className="form-input"
                value={newComplaint.bienContratado}
                onChange={(e) =>
                  setNewComplaint((prev) => ({ ...prev, bienContratado: e.target.value }))
                }
                required
              />
            </label>
            <label className="form-group">
              <span>Monto (solo reclamo)</span>
              <input
                className="form-input"
                value={newComplaint.monto}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, monto: e.target.value }))}
              />
            </label>
            <label className="form-group complaint-book-grid-full">
              <span>Detalle</span>
              <textarea
                className="form-input complaint-book-textarea"
                rows={4}
                value={newComplaint.detalle}
                onChange={(e) => setNewComplaint((prev) => ({ ...prev, detalle: e.target.value }))}
                required
              />
            </label>
          </div>
          <button type="submit" className="btn-primary complaint-book-submit" disabled={creatingComplaint}>
            {creatingComplaint ? "Registrando..." : "Registrar hoja"}
          </button>
        </form>
      ) : null}

      {loadError ? (
        <div className="admin-error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {loadError}
        </div>
      ) : null}

      {renderComplaintsMain({
        loading,
        complaints,
        expanded,
        setExpanded,
        savingCodigo,
        notasDraft,
        setNotasDraft,
        onEstadoChange: handleEstadoChange,
        onSaveNotas: handleSaveNotas,
      })}
    </div>
  );
}

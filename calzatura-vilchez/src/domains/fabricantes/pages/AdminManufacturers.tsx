import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  BadgeDollarSign,
  Eye,
  FileImage,
  IdCard,
  Pencil,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  Upload,
  UserRoundCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  addManufacturer,
  deleteManufacturer,
  fetchManufacturers,
  updateManufacturer,
} from "@/domains/fabricantes/services/manufacturers";
import { isValidDni, lookupDni, normalizeDni } from "@/domains/usuarios/services/dni";
import type { Manufacturer, ManufacturerDocument } from "@/types";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import { compressImageFile, uploadImageToCloudinary } from "@/domains/administradores/services/cloudinary";

type ManufacturerForm = Omit<Manufacturer, "id" | "creadoEn" | "actualizadoEn">;
type StatusFilter = "todos" | "activos" | "inactivos";
type DocumentType = ManufacturerDocument["tipo"];

const EMPTY_FORM: ManufacturerForm = {
  dni: "",
  nombres: "",
  apellidos: "",
  marca: "",
  telefono: "",
  ultimoIngresoFecha: "",
  ultimoIngresoMonto: 0,
  documentos: [],
  observaciones: "",
  activo: true,
};
const DOCUMENT_LIMIT = 8;

function toPositiveNumber(value: string) {
  const clean = value.replace(/[^\d.]/g, "");
  const parts = clean.split(".");
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : clean;
  return Math.max(0, Number(normalized) || 0);
}

function formatMoney(value?: number) {
  return `S/ ${(value ?? 0).toFixed(2)}`;
}

function fullName(item: Manufacturer) {
  return [item.nombres, item.apellidos].filter(Boolean).join(" ").trim();
}

function documentLabel(type: DocumentType) {
  return type === "boleta" ? "Boletas" : "Guías";
}

function showDniLookupError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "DNI_LOOKUP_NOT_CONFIGURED") {
    toast.error("Configura VITE_DNI_LOOKUP_URL para validar el DNI");
  } else if (message === "DNI_NOT_FOUND") {
    toast.error("No se encontraron datos para este DNI");
  } else {
    toast.error("No se pudo validar el DNI");
  }
}

export default function AdminManufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ManufacturerForm>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [lookupDoneFor, setLookupDoneFor] = useState("");
  const [validatedDni, setValidatedDni] = useState("");
  const [previewDocument, setPreviewDocument] = useState<ManufacturerDocument | null>(null);
  const [detailManufacturer, setDetailManufacturer] = useState<Manufacturer | null>(null);
  const fileInputRefs = useRef<Record<DocumentType, HTMLInputElement | null>>({
    boleta: null,
    guia: null,
  });

  const loadManufacturers = async () => {
    setLoading(true);
    try {
      setManufacturers(await fetchManufacturers());
    } catch {
      toast.error("No se pudieron cargar los fabricantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = globalThis.setTimeout(loadManufacturers, 0);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isValidDni(form.dni) || form.dni === lookupDoneFor) return;
    let cancelled = false;
    const timer = globalThis.setTimeout(async () => {
      try {
        const data = await lookupDni(form.dni);
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          nombres: current.nombres || data.nombres,
          apellidos: current.apellidos || data.apellidos,
        }));
        setLookupDoneFor(form.dni);
        setValidatedDni(form.dni);
      } catch (error) {
        if (cancelled) return;
        showDniLookupError(error);
        setLookupDoneFor(form.dni);
        setValidatedDni("");
      }
    }, 500);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [form.dni, lookupDoneFor]);

  const stats = useMemo(() => {
    const active = manufacturers.filter((item) => item.activo).length;
    const docs = manufacturers.reduce((sum, item) => sum + (item.documentos?.length ?? 0), 0);
    const lastIncome = manufacturers.reduce((max, item) => Math.max(max, item.ultimoIngresoMonto ?? 0), 0);
    return { active, docs, lastIncome };
  }, [manufacturers]);

  const filteredManufacturers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return manufacturers.filter((item) => {
      const searchable = [
        item.dni,
        fullName(item),
        item.marca,
        item.telefono,
        item.ultimoIngresoFecha,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = term === "" || searchable.includes(term);
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activos" && item.activo) ||
        (statusFilter === "inactivos" && !item.activo);
      return matchesSearch && matchesStatus;
    });
  }, [manufacturers, searchTerm, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLookupDoneFor("");
    setValidatedDni("");
    setShowModal(true);
  };

  const openEdit = (item: Manufacturer) => {
    setEditingId(item.id);
    setForm({
      dni: item.dni,
      nombres: item.nombres,
      apellidos: item.apellidos,
      marca: item.marca,
      telefono: item.telefono ?? "",
      ultimoIngresoFecha: item.ultimoIngresoFecha ?? "",
      ultimoIngresoMonto: item.ultimoIngresoMonto ?? 0,
      documentos: item.documentos ?? [],
      observaciones: item.observaciones ?? "",
      activo: item.activo,
    });
    setLookupDoneFor(item.dni);
    setValidatedDni(item.dni);
    setShowModal(true);
  };

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if ((form.documentos ?? []).length >= DOCUMENT_LIMIT) {
      toast.error(`Solo puedes cargar hasta ${DOCUMENT_LIMIT} documentos por fabricante`);
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImageFile(file, 900, 0.76);
      const imagen = await uploadImageToCloudinary(compressed, file.name);
      const documentItem: ManufacturerDocument = {
        id: crypto.randomUUID(),
        tipo: type,
        nombre: file.name,
        imagen,
        creadoEn: new Date().toISOString(),
      };
      setForm((current) => ({
        ...current,
        documentos: [...(current.documentos ?? []), documentItem],
      }));
    } catch {
      toast.error("No se pudo subir la imagen a Cloudinary");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeDocument = (id: string) => {
    setForm((current) => ({
      ...current,
      documentos: (current.documentos ?? []).filter((item) => item.id !== id),
    }));
  };

  const updateDocumentObservacion = (id: string, observaciones: string) => {
    setForm((current) => ({
      ...current,
      documentos: (current.documentos ?? []).map((doc) =>
        doc.id === id ? { ...doc, observaciones } : doc
      ),
    }));
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!detailManufacturer) return;
    const nextDocs = (detailManufacturer.documentos ?? []).filter((d) => d.id !== docId);
    try {
      await updateManufacturer(detailManufacturer.id, {
        documentos: nextDocs,
        actualizadoEn: new Date().toISOString(),
      });
      const updated = { ...detailManufacturer, documentos: nextDocs };
      setDetailManufacturer(updated);
      setManufacturers((prev) => prev.map((m) => m.id === detailManufacturer.id ? updated : m));
      toast.success("Documento eliminado");
    } catch {
      toast.error("No se pudo eliminar el documento");
    }
  };

  const handleSave = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDni = normalizeDni(form.dni);
    if (!isValidDni(normalizedDni)) {
      toast.error("El DNI debe tener 8 dígitos");
      return;
    }
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.marca.trim()) {
      toast.error("Completa nombres, apellidos y marca");
      return;
    }

    setSaving(true);
    let verifiedPerson: Awaited<ReturnType<typeof lookupDni>> | null = null;
    try {
      if (validatedDni !== normalizedDni) {
        verifiedPerson = await lookupDni(normalizedDni);
        setValidatedDni(normalizedDni);
        setForm((current) => ({
          ...current,
          dni: normalizedDni,
          nombres: verifiedPerson?.nombres ?? current.nombres,
          apellidos: verifiedPerson?.apellidos ?? current.apellidos,
        }));
      }
    } catch (error) {
      setValidatedDni("");
      showDniLookupError(error);
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const payload: Omit<Manufacturer, "id"> = {
      dni: normalizedDni,
      nombres: (verifiedPerson?.nombres ?? form.nombres).trim().toUpperCase(),
      apellidos: (verifiedPerson?.apellidos ?? form.apellidos).trim().toUpperCase(),
      marca: form.marca.trim(),
      telefono: form.telefono?.trim() || "",
      ultimoIngresoFecha: form.ultimoIngresoFecha || "",
      ultimoIngresoMonto: form.ultimoIngresoMonto ?? 0,
      documentos: form.documentos ?? [],
      observaciones: form.observaciones?.trim() || "",
      activo: form.activo,
      creadoEn: now,
      actualizadoEn: now,
    };

    try {
      if (editingId) {
        await updateManufacturer(editingId, {
          dni: payload.dni,
          nombres: payload.nombres,
          apellidos: payload.apellidos,
          marca: payload.marca,
          telefono: payload.telefono,
          ultimoIngresoFecha: payload.ultimoIngresoFecha,
          ultimoIngresoMonto: payload.ultimoIngresoMonto,
          documentos: payload.documentos,
          observaciones: payload.observaciones,
          activo: payload.activo,
          actualizadoEn: now,
        });
        toast.success("Fabricante actualizado");
      } else {
        await addManufacturer(payload);
        toast.success("Fabricante registrado");
      }
      setShowModal(false);
      await loadManufacturers();
    } catch {
      toast.error("No se pudo guardar el fabricante");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Manufacturer) => {
    if (!confirm(`¿Eliminar a ${item.marca}?`)) return;
    try {
      await deleteManufacturer(item.id);
      setManufacturers((current) => current.filter((manufacturer) => manufacturer.id !== item.id));
      toast.success("Fabricante eliminado");
    } catch {
      toast.error("No se pudo eliminar el fabricante");
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="success-spinner" />
        <p>Cargando fabricantes...</p>
      </div>
    );
  }

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Fabricantes</h1>
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <Store size={22} />
          <div><span>Total</span><strong>{manufacturers.length}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <UserRoundCheck size={22} />
          <div><span>Activos</span><strong>{stats.active}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <FileImage size={22} />
          <div><span>Documentos</span><strong>{stats.docs}</strong></div>
        </div>
        <div className="stat-card admin-metric-card">
          <BadgeDollarSign size={22} />
          <div><span>Mayor ingreso</span><strong>{formatMoney(stats.lastIncome)}</strong></div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrapper">
          <Search size={17} />
          <input
            aria-label="Buscar fabricantes"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por DNI, fabricante, marca o teléfono"
          />
        </div>
        <div className="admin-filter-grid admin-manufacturer-filter-grid">
          <select
            aria-label="Filtrar fabricantes por estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="form-input"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
          <button type="button" onClick={openCreate} className="btn-primary admin-toolbar-create">
            <Plus size={16} /> Fabricante nuevo
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper product-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>DNI</th>
              <th>Fabricante</th>
              <th>Marca</th>
              <th>Último ingreso</th>
              <th>Documentos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredManufacturers.length === 0 && (
              <tr>
                <td colSpan={7} className="admin-empty-cell">
                  No se encontraron fabricantes.
                </td>
              </tr>
            )}
            {filteredManufacturers.map((item) => (
              <tr key={item.id}>
                <td><span className="admin-code-badge">{item.dni}</span></td>
                <td>
                  <div className="admin-product-cell">
                    <strong>{fullName(item)}</strong>
                    <span>{item.telefono || "Sin teléfono"}</span>
                  </div>
                </td>
                <td><span className="admin-soft-badge">{item.marca}</span></td>
                <td>
                  <div className="admin-range-cell">
                    <strong>{formatMoney(item.ultimoIngresoMonto)}</strong>
                    <span>{item.ultimoIngresoFecha || "Sin fecha"}</span>
                  </div>
                </td>
                <td>{item.documentos?.length ?? 0}</td>
                <td>
                  <span className={`admin-status-badge ${item.activo ? "featured" : "muted"}`}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button type="button" onClick={() => setDetailManufacturer(item)} className="action-btn" aria-label="Ver detalle">
                      <Eye size={15} />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="action-btn edit-btn" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); void handleDelete(item); }} className="action-btn delete-btn" aria-label="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <button type="button" className="manufacturer-modal-backdrop" aria-label="Cerrar" onClick={() => setShowModal(false)} />
          <div className="modal manufacturer-modal">
            <div className="modal-header">
              <h2>{editingId ? "Editar fabricante" : "Nuevo fabricante"}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="manufacturer-form-grid">
                <div className="admin-form-card">
                  <div className="admin-form-card-header">
                    <strong>Datos</strong>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="manufacturer-dni">DNI *</label>
                      <div className="input-wrapper">
                        <IdCard size={15} className="input-icon" />
                        <input
                          id="manufacturer-dni"
                          value={form.dni}
                          onChange={(event) => {
                            const dni = normalizeDni(event.target.value);
                            setForm({ ...form, dni });
                            if (dni !== lookupDoneFor) {
                              setValidatedDni("");
                              setForm((current) => ({ ...current, dni, nombres: "", apellidos: "" }));
                            }
                          }}
                          className="form-input with-icon"
                          required
                          placeholder="12345678"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="manufacturer-brand">Marca *</label>
                      <input
                        id="manufacturer-brand"
                        value={form.marca}
                        onChange={(event) => setForm({ ...form, marca: event.target.value })}
                        className="form-input"
                        required
                        placeholder="Marca del fabricante"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="manufacturer-names">Nombres *</label>
                      <input
                        id="manufacturer-names"
                        value={form.nombres}
                        onChange={(event) => setForm({ ...form, nombres: event.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="manufacturer-lastnames">Apellidos *</label>
                      <input
                        id="manufacturer-lastnames"
                        value={form.apellidos}
                        onChange={(event) => setForm({ ...form, apellidos: event.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="manufacturer-phone">Teléfono</label>
                      <input
                        id="manufacturer-phone"
                        value={form.telefono ?? ""}
                        onChange={(event) => setForm({ ...form, telefono: event.target.value.replace(/\D/g, "").slice(0, 9) })}
                        className="form-input"
                        placeholder="999999999"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="manufacturer-status">Estado</label>
                      <select
                        id="manufacturer-status"
                        value={form.activo ? "activo" : "inactivo"}
                        onChange={(event) => setForm({ ...form, activo: event.target.value === "activo" })}
                        className="form-input"
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="admin-form-card">
                  <div className="admin-form-card-header">
                    <strong>Ingreso</strong>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="manufacturer-last-income-date">Fecha del último ingreso</label>
                      <input
                        id="manufacturer-last-income-date"
                        type="date"
                        value={form.ultimoIngresoFecha ?? ""}
                        onChange={(event) => setForm({ ...form, ultimoIngresoFecha: event.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="manufacturer-last-income-amount">Monto del último ingreso (S/)</label>
                      <input
                        id="manufacturer-last-income-amount"
                        type="text"
                        inputMode="decimal"
                        value={form.ultimoIngresoMonto === 0 ? "" : form.ultimoIngresoMonto}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setForm({ ...form, ultimoIngresoMonto: toPositiveNumber(event.target.value) })}
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="manufacturer-notes">Observaciones</label>
                    <textarea
                      id="manufacturer-notes"
                      value={form.observaciones ?? ""}
                      onChange={(event) => setForm({ ...form, observaciones: event.target.value })}
                      className="form-input"
                      rows={3}
                      placeholder="Notas internas, acuerdos o detalles de entrega"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-form-card">
                <div className="admin-form-card-header">
                  <strong>Documentos</strong>
                  <span className="form-hint">Fotos de boletas y guías</span>
                </div>
                <div className="manufacturer-doc-actions">
                  {(["boleta", "guia"] as DocumentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className="btn-outline manufacturer-upload-btn"
                      onClick={() => fileInputRefs.current[type]?.click()}
                      disabled={uploading}
                    >
                      <Upload size={16} /> {documentLabel(type)}
                    </button>
                  ))}
                </div>
                {(["boleta", "guia"] as DocumentType[]).map((type) => (
                  <input
                    key={type}
                    ref={(element) => { fileInputRefs.current[type] = element; }}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleDocumentUpload(event, type)}
                    style={{ display: "none" }}
                  />
                ))}
                <div className="manufacturer-document-grid">
                  {(form.documentos ?? []).map((item) => (
                    <div key={item.id} className="manufacturer-document-card">
                      <button
                        type="button"
                        className="manufacturer-document-preview"
                        onClick={() => setPreviewDocument(item)}
                        aria-label={`Abrir ${item.nombre}`}
                      >
                        <img src={item.imagen} alt={item.nombre} />
                      </button>
                      <div>
                        <span>{item.tipo === "boleta" ? "Boleta" : "Guía"}</span>
                        <strong>{item.nombre}</strong>
                        <input
                          id={`manufacturer-doc-observation-${item.id}`}
                          type="text"
                          aria-label={`Observación de ${item.nombre}`}
                          className="form-input manufacturer-doc-obs-input"
                          placeholder="Observación (opcional)"
                          value={item.observaciones ?? ""}
                          onChange={(e) => updateDocumentObservacion(item.id, e.target.value)}
                        />
                      </div>
                      <button type="button" className="manufacturer-document-remove" onClick={() => removeDocument(item.id)} aria-label="Quitar documento">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(form.documentos ?? []).length === 0 && (
                    <p className="admin-empty manufacturer-empty-docs">Sin documentos cargados.</p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving || uploading}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewDocument && (
        <ImagePreviewModal
          src={previewDocument.imagen}
          title={previewDocument.nombre}
          subtitle={previewDocument.tipo === "boleta" ? "Boleta" : "Guía"}
          onClose={() => setPreviewDocument(null)}
        />
      )}

      {detailManufacturer && !previewDocument && (
        <div className="sale-modal-overlay">
          <button type="button" className="manufacturer-modal-backdrop" aria-label="Cerrar" onClick={() => setDetailManufacturer(null)} />
          <div className="sale-modal mfr-detail-modal">

            <div className="sale-modal-header">
              <div className="mfr-detail-title">
                <div>
                  <h2>{fullName(detailManufacturer)}</h2>
                  <span className="admin-soft-badge">{detailManufacturer.marca}</span>
                </div>
                <span className={`admin-status-badge ${detailManufacturer.activo ? "featured" : "muted"}`}>
                  {detailManufacturer.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mfr-detail-header-actions">
                <button
                  type="button"
                  className="action-btn edit-btn"
                  aria-label="Editar"
                  onClick={() => { setDetailManufacturer(null); openEdit(detailManufacturer); }}
                >
                  <Pencil size={15} />
                </button>
                <button type="button" className="sale-modal-close" onClick={() => setDetailManufacturer(null)} aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="sale-modal-body">

              {/* Contacto */}
              <div className="sale-modal-grid">
                <div className="sale-modal-info">
                  <span className="sale-modal-info-label"><IdCard size={11} style={{ display: "inline", marginRight: 4 }} />DNI</span>
                  <span>{detailManufacturer.dni}</span>
                </div>
                <div className="sale-modal-info">
                  <span className="sale-modal-info-label"><Phone size={11} style={{ display: "inline", marginRight: 4 }} />Teléfono</span>
                  <span>{detailManufacturer.telefono || "No registrado"}</span>
                </div>
              </div>

              {/* Último ingreso */}
              <div className="mfr-detail-income">
                <div>
                  <span className="sale-modal-info-label">Último ingreso</span>
                  <strong>{formatMoney(detailManufacturer.ultimoIngresoMonto)}</strong>
                </div>
                <div>
                  <span className="sale-modal-info-label">Fecha</span>
                  <span>
                    {detailManufacturer.ultimoIngresoFecha
                      ? new Date(detailManufacturer.ultimoIngresoFecha + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })
                      : "Sin fecha registrada"}
                  </span>
                </div>
              </div>

              {/* Observaciones */}
              {detailManufacturer.observaciones && (
                <div className="mfr-detail-obs">
                  <span className="sale-modal-info-label">Observaciones</span>
                  <p>{detailManufacturer.observaciones}</p>
                </div>
              )}

              {/* Documentos */}
              <div>
                <p className="mfr-detail-doc-title">
                  Documentos ({detailManufacturer.documentos?.length ?? 0})
                  {(detailManufacturer.documentos?.filter(d => d.tipo === "boleta").length ?? 0) > 0 && (
                    <span>{detailManufacturer.documentos!.filter(d => d.tipo === "boleta").length} boleta(s)</span>
                  )}
                  {(detailManufacturer.documentos?.filter(d => d.tipo === "guia").length ?? 0) > 0 && (
                    <span>{detailManufacturer.documentos!.filter(d => d.tipo === "guia").length} guía(s)</span>
                  )}
                </p>
                {(detailManufacturer.documentos?.length ?? 0) === 0 ? (
                  <p className="admin-empty">Sin documentos registrados.</p>
                ) : (
                  <div className="mfr-detail-doc-grid">
                    {[...(detailManufacturer.documentos ?? [])]
                      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
                      .map((doc) => (
                        <div key={doc.id} className="mfr-detail-doc-thumb">
                          <button
                            type="button"
                            className="mfr-detail-doc-img-btn"
                            onClick={() => setPreviewDocument(doc)}
                            aria-label={`Ver ${doc.nombre}`}
                          >
                            <img src={doc.imagen} alt={doc.nombre} />
                          </button>
                          <div className="mfr-detail-doc-footer">
                            <span className="mfr-detail-doc-tipo">{doc.tipo === "boleta" ? "Boleta" : "Guía"}</span>
                            <span className="mfr-detail-doc-date">
                              {new Date(doc.creadoEn).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            {doc.observaciones && (
                              <span className="mfr-detail-doc-obs">{doc.observaciones}</span>
                            )}
                            <button
                              type="button"
                              className="mfr-detail-doc-delete"
                              onClick={() => handleDeleteDocument(doc.id)}
                              aria-label="Eliminar documento"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="mfr-detail-timestamps">
                <span>Registrado: {new Date(detailManufacturer.creadoEn).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span>Actualizado: {new Date(detailManufacturer.actualizadoEn).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

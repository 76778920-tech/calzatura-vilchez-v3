import { useRef, useState } from "react";
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { read, utils, writeFile } from "xlsx";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Loader, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "@/firebase/config";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportStatus = "idle" | "loading" | "success" | "error";
type ExportStatus = "idle" | "loading" | "success";

type Row = Record<string, unknown>;

interface CollectionConfig {
  id: string;
  label: string;
  description: string;
  canImport: boolean;
  templateHeaders: string[];
  templateExample: Row;
  exportTransform: (d: Row) => Row;
  importTransform: (row: Row) => Row;
  importValidate: (row: Row) => string | null;
}

// ── Configuración de colecciones ──────────────────────────────────────────────

const COLLECTIONS: CollectionConfig[] = [
  {
    id: "productos",
    label: "Productos",
    description: "Catálogo completo de calzado",
    canImport: true,
    templateHeaders: ["nombre", "precio", "stock", "categoria", "descripcion", "marca", "color", "destacado"],
    templateExample: {
      nombre: "Zapatilla Deportiva",
      precio: 89.90,
      stock: 10,
      categoria: "Deportivo",
      descripcion: "Descripcion del producto (opcional)",
      marca: "Nike",
      color: "Negro",
      destacado: false,
    },
    exportTransform: (d) => ({
      id: d.id ?? "",
      nombre: d.nombre ?? "",
      precio: d.precio ?? 0,
      stock: d.stock ?? 0,
      categoria: d.categoria ?? "",
      descripcion: d.descripcion ?? "",
      marca: d.marca ?? "",
      color: d.color ?? "",
      destacado: d.destacado ?? false,
    }),
    importTransform: (row) => ({
      nombre: String(row.nombre ?? "").trim(),
      precio: Number(row.precio ?? 0),
      stock: Number(row.stock ?? 0),
      categoria: String(row.categoria ?? "").trim(),
      descripcion: String(row.descripcion ?? "").trim(),
      marca: String(row.marca ?? "").trim(),
      color: String(row.color ?? "").trim(),
      destacado: String(row.destacado).toLowerCase() === "true",
      imagen: "",
      imagenes: [],
      esDePrueba: true,
      importadoEn: new Date().toISOString(),
    }),
    importValidate: (row) => {
      if (!row.nombre) return "Falta el campo 'nombre'";
      if (row.precio === undefined || isNaN(Number(row.precio))) return "El campo 'precio' debe ser un número";
      if (row.stock === undefined || isNaN(Number(row.stock))) return "El campo 'stock' debe ser un número";
      if (!row.categoria) return "Falta el campo 'categoria'";
      return null;
    },
  },
  {
    id: "fabricantes",
    label: "Fabricantes",
    description: "Proveedores y fabricantes registrados",
    canImport: true,
    templateHeaders: ["dni", "nombres", "apellidos", "marca", "telefono", "observaciones"],
    templateExample: {
      dni: "12345678",
      nombres: "Juan",
      apellidos: "Perez Lopez",
      marca: "Marca XYZ",
      telefono: "999888777",
      observaciones: "",
    },
    exportTransform: (d) => ({
      id: d.id ?? "",
      dni: d.dni ?? "",
      nombres: d.nombres ?? "",
      apellidos: d.apellidos ?? "",
      marca: d.marca ?? "",
      telefono: d.telefono ?? "",
      activo: d.activo ?? true,
      observaciones: d.observaciones ?? "",
      creadoEn: d.creadoEn ?? "",
    }),
    importTransform: (row) => ({
      dni: String(row.dni ?? "").trim(),
      nombres: String(row.nombres ?? "").trim(),
      apellidos: String(row.apellidos ?? "").trim(),
      marca: String(row.marca ?? "").trim(),
      telefono: String(row.telefono ?? "").trim(),
      observaciones: String(row.observaciones ?? "").trim(),
      activo: true,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      esDePrueba: true,
      importadoEn: new Date().toISOString(),
    }),
    importValidate: (row) => {
      const dni = String(row.dni ?? "").replace(/\D/g, "");
      if (dni.length !== 8) return "El DNI debe tener exactamente 8 dígitos";
      if (!row.nombres) return "Falta el campo 'nombres'";
      if (!row.apellidos) return "Falta el campo 'apellidos'";
      if (!row.marca) return "Falta el campo 'marca'";
      return null;
    },
  },
  {
    id: "ventasDiarias",
    label: "Ventas Diarias",
    description: "Historial de ventas — ideal para datos de prueba",
    canImport: true,
    templateHeaders: [
      "productId", "codigo", "nombre", "color", "talla",
      "fecha", "cantidad", "precioVenta", "total",
      "costoUnitario", "costoTotal", "ganancia",
      "documentoTipo", "documentoNumero",
    ],
    templateExample: {
      productId: "ID_PRODUCTO_FIRESTORE",
      codigo: "CV-001",
      nombre: "Zapatilla Deportiva",
      color: "Negro",
      talla: "40",
      fecha: "2026-04-20",
      cantidad: 2,
      precioVenta: 89.90,
      total: 179.80,
      costoUnitario: 60.00,
      costoTotal: 120.00,
      ganancia: 59.80,
      documentoTipo: "ninguno",
      documentoNumero: "",
    },
    exportTransform: (d) => ({
      id: d.id ?? "",
      productId: d.productId ?? "",
      codigo: d.codigo ?? "",
      nombre: d.nombre ?? "",
      color: d.color ?? "",
      talla: d.talla ?? "",
      fecha: d.fecha ?? "",
      cantidad: d.cantidad ?? 0,
      precioVenta: d.precioVenta ?? 0,
      total: d.total ?? 0,
      costoUnitario: d.costoUnitario ?? 0,
      costoTotal: d.costoTotal ?? 0,
      ganancia: d.ganancia ?? 0,
      documentoTipo: d.documentoTipo ?? "ninguno",
      documentoNumero: d.documentoNumero ?? "",
      devuelto: d.devuelto ?? false,
      creadoEn: d.creadoEn ?? "",
    }),
    importTransform: (row) => ({
      productId: String(row.productId ?? "").trim(),
      codigo: String(row.codigo ?? "").trim(),
      nombre: String(row.nombre ?? "").trim(),
      color: String(row.color ?? "").trim(),
      talla: String(row.talla ?? "").trim(),
      fecha: String(row.fecha ?? "").trim(),
      cantidad: Number(row.cantidad ?? 0),
      precioVenta: Number(row.precioVenta ?? 0),
      total: Number(row.total ?? 0),
      costoUnitario: Number(row.costoUnitario ?? 0),
      costoTotal: Number(row.costoTotal ?? 0),
      ganancia: Number(row.ganancia ?? 0),
      documentoTipo: String(row.documentoTipo ?? "ninguno").trim(),
      documentoNumero: String(row.documentoNumero ?? "").trim(),
      devuelto: false,
      creadoEn: new Date().toISOString(),
      esDePrueba: true,
      importadoEn: new Date().toISOString(),
    }),
    importValidate: (row) => {
      if (!row.productId) return "Falta el campo 'productId'";
      if (!row.fecha) return "Falta el campo 'fecha'";
      if (row.cantidad === undefined || isNaN(Number(row.cantidad))) return "El campo 'cantidad' debe ser un número";
      if (row.precioVenta === undefined || isNaN(Number(row.precioVenta))) return "El campo 'precioVenta' debe ser un número";
      if (row.total === undefined || isNaN(Number(row.total))) return "El campo 'total' debe ser un número";
      return null;
    },
  },
  {
    id: "pedidos",
    label: "Pedidos",
    description: "Solo exportación — los pedidos se generan desde la tienda",
    canImport: false,
    templateHeaders: [],
    templateExample: {},
    exportTransform: (d) => {
      const creadoEn = d.creadoEn;
      const fecha =
        creadoEn !== null &&
        typeof creadoEn === "object" &&
        "toDate" in (creadoEn as object)
          ? (creadoEn as { toDate(): Date }).toDate().toISOString()
          : String(creadoEn ?? "");
      return {
        id: d.id ?? "",
        userId: d.userId ?? "",
        userEmail: d.userEmail ?? "",
        total: d.total ?? 0,
        subtotal: d.subtotal ?? 0,
        envio: d.envio ?? 0,
        estado: d.estado ?? "",
        metodoPago: d.metodoPago ?? "",
        notas: d.notas ?? "",
        creadoEn: fecha,
      };
    },
    importTransform: () => ({}),
    importValidate: () => null,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Solo exportación — los usuarios se registran desde la tienda",
    canImport: false,
    templateHeaders: [],
    templateExample: {},
    exportTransform: (d) => ({
      uid: d.uid ?? d.id ?? "",
      dni: d.dni ?? "",
      nombre: d.nombre ?? "",
      email: d.email ?? "",
      rol: d.rol ?? "",
      telefono: d.telefono ?? "",
      creadoEn: d.creadoEn ?? "",
    }),
    importTransform: () => ({}),
    importValidate: () => null,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function exportCollection(config: CollectionConfig): Promise<void> {
  const snap = await getDocs(collection(db, config.id));
  const rows = snap.docs.map((d) =>
    config.exportTransform({ id: d.id, ...d.data() } as Row)
  );
  if (rows.length === 0) throw new Error("La colección está vacía");
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, config.label);
  writeFile(wb, `${config.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadTemplate(config: CollectionConfig): void {
  const ws = utils.json_to_sheet([config.templateExample]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Plantilla");
  writeFile(wb, `plantilla_${config.id}.xlsx`);
}

async function importRows(
  config: CollectionConfig,
  rows: Row[]
): Promise<{ ok: number; errors: string[] }> {
  const errors: string[] = [];
  const validRows: Row[] = [];

  rows.forEach((row, i) => {
    const err = config.importValidate(row);
    if (err) {
      errors.push(`Fila ${i + 2}: ${err}`);
    } else {
      validRows.push(config.importTransform(row));
    }
  });

  const CHUNK = 400;
  for (let i = 0; i < validRows.length; i += CHUNK) {
    const batch = writeBatch(db);
    validRows.slice(i, i + CHUNK).forEach((row) => {
      batch.set(doc(collection(db, config.id)), row);
    });
    await batch.commit();
  }

  return { ok: validRows.length, errors };
}

// ── Limpieza de datos de prueba ───────────────────────────────────────────────

const IMPORTABLE_COLLECTIONS = COLLECTIONS.filter((c) => c.canImport).map((c) => c.id);

async function deleteTestData(): Promise<number> {
  let total = 0;
  for (const col of IMPORTABLE_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, col), where("esDePrueba", "==", true)));
    const CHUNK = 400;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    total += docs.length;
  }
  return total;
}

async function countTestData(): Promise<number> {
  let total = 0;
  for (const col of IMPORTABLE_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, col), where("esDePrueba", "==", true)));
    total += snap.size;
  }
  return total;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminData() {
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});
  const [exportStatus, setExportStatus] = useState<Record<string, ExportStatus>>({});
  const [importErrors, setImportErrors] = useState<Record<string, string[]>>({});
  const [importResult, setImportResult] = useState<Record<string, { ok: number; total: number }>>({});
  const [testCount, setTestCount] = useState<number | null>(null);
  const [cleanLoading, setCleanLoading] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCountTest = async () => {
    const count = await countTestData();
    setTestCount(count);
  };

  const handleCleanTest = async () => {
    if (!window.confirm("¿Eliminar todos los datos de prueba importados? Los datos reales NO se verán afectados.")) return;
    setCleanLoading(true);
    try {
      const deleted = await deleteTestData();
      setTestCount(0);
      toast.success(`${deleted} registros de prueba eliminados`);
    } catch {
      toast.error("Error al eliminar los datos de prueba");
    } finally {
      setCleanLoading(false);
    }
  };

  const handleExport = async (config: CollectionConfig) => {
    setExportStatus((prev) => ({ ...prev, [config.id]: "loading" }));
    try {
      await exportCollection(config);
      setExportStatus((prev) => ({ ...prev, [config.id]: "success" }));
      toast.success(`${config.label} exportado`);
      setTimeout(() => setExportStatus((prev) => ({ ...prev, [config.id]: "idle" })), 3000);
    } catch (err) {
      setExportStatus((prev) => ({ ...prev, [config.id]: "idle" }));
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al exportar: ${msg}`);
    }
  };

  const handleImport = async (config: CollectionConfig, file: File) => {
    setImportStatus((prev) => ({ ...prev, [config.id]: "loading" }));
    setImportErrors((prev) => ({ ...prev, [config.id]: [] }));
    setImportResult((prev) => ({ ...prev, [config.id]: { ok: 0, total: 0 } }));
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json<Row>(ws);

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        setImportStatus((prev) => ({ ...prev, [config.id]: "idle" }));
        return;
      }

      const { ok, errors } = await importRows(config, rows);
      setImportErrors((prev) => ({ ...prev, [config.id]: errors }));
      setImportResult((prev) => ({ ...prev, [config.id]: { ok, total: rows.length } }));

      if (errors.length === 0) {
        setImportStatus((prev) => ({ ...prev, [config.id]: "success" }));
        toast.success(`${ok} registros importados correctamente`);
      } else {
        setImportStatus((prev) => ({ ...prev, [config.id]: "error" }));
        toast.error(`${ok} importados, ${errors.length} con errores`);
      }
    } catch {
      setImportStatus((prev) => ({ ...prev, [config.id]: "error" }));
      setImportErrors((prev) => ({
        ...prev,
        [config.id]: ["No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido."],
      }));
      toast.error("Error al procesar el archivo");
    }
  };

  return (
    <div className="pred-root">
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Importación y exportación</p>
          <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={26} /> Gestión de Datos Excel
          </h1>
        </div>
      </div>

      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "1.5rem", maxWidth: "680px" }}>
        Exporta cualquier colección a Excel, o importa datos de prueba desde un archivo. Descarga primero
        la plantilla para ver el formato exacto que se espera.
      </p>

      <div className="data-grid">
        {COLLECTIONS.map((config) => {
          const iStatus = importStatus[config.id] ?? "idle";
          const eStatus = exportStatus[config.id] ?? "idle";
          const errors = importErrors[config.id] ?? [];
          const result = importResult[config.id];

          return (
            <div key={config.id} className="dash-card data-card">
              <div className="data-card-header">
                <FileSpreadsheet size={20} className="data-card-icon" />
                <div>
                  <h3 className="data-card-title">{config.label}</h3>
                  <p className="data-card-desc">{config.description}</p>
                </div>
              </div>

              <div className="data-card-actions">
                <button
                  type="button"
                  className="btn btn-primary data-btn"
                  disabled={eStatus === "loading"}
                  onClick={() => handleExport(config)}
                >
                  {eStatus === "loading" ? (
                    <Loader size={15} className="data-spin" />
                  ) : eStatus === "success" ? (
                    <CheckCircle size={15} />
                  ) : (
                    <Download size={15} />
                  )}
                  {eStatus === "loading"
                    ? "Exportando..."
                    : eStatus === "success"
                    ? "Descargado"
                    : `Exportar ${config.label}`}
                </button>

                {config.canImport && (
                  <>
                    <div className="data-import-row">
                      <button
                        type="button"
                        className="btn data-btn-ghost"
                        onClick={() => downloadTemplate(config)}
                      >
                        <Download size={13} /> Plantilla
                      </button>
                      <button
                        type="button"
                        className="btn data-btn-ghost data-btn-import"
                        disabled={iStatus === "loading"}
                        onClick={() => fileRefs.current[config.id]?.click()}
                      >
                        {iStatus === "loading" ? (
                          <Loader size={13} className="data-spin" />
                        ) : iStatus === "success" ? (
                          <CheckCircle size={13} style={{ color: "#10b981" }} />
                        ) : iStatus === "error" ? (
                          <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
                        ) : (
                          <Upload size={13} />
                        )}
                        {iStatus === "loading" ? "Importando..." : "Importar Excel"}
                      </button>
                      <input
                        ref={(el) => { fileRefs.current[config.id] = el; }}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleImport(config, file);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {result && result.total > 0 && (
                      <p className={`data-result ${errors.length === 0 ? "data-result-ok" : "data-result-warn"}`}>
                        {result.ok} de {result.total} filas importadas
                        {errors.length > 0 ? ` — ${errors.length} con errores` : " correctamente"}
                      </p>
                    )}

                    {errors.length > 0 && (
                      <div className="data-errors">
                        {errors.slice(0, 8).map((err, i) => (
                          <p key={i} className="data-error-line">• {err}</p>
                        ))}
                        {errors.length > 8 && (
                          <p className="data-error-more">...y {errors.length - 8} errores más</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!config.canImport && (
                  <p className="data-no-import">
                    La importación no está disponible para esta colección.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Limpieza de datos de prueba */}
      <div className="dash-card data-clean-card">
        <div className="data-clean-header">
          <Trash2 size={20} className="data-clean-icon" />
          <div>
            <h3 className="data-card-title">Limpiar datos de prueba</h3>
            <p className="data-card-desc">
              Elimina todos los registros importados desde Excel. Los datos reales del negocio no se verán afectados.
            </p>
          </div>
        </div>

        <div className="data-clean-actions">
          <button
            type="button"
            className="btn data-btn-ghost"
            onClick={handleCountTest}
            disabled={cleanLoading}
          >
            <FileSpreadsheet size={14} />
            {testCount === null ? "Contar datos de prueba" : `${testCount} registros de prueba encontrados`}
          </button>

          <button
            type="button"
            className="btn data-btn-danger"
            onClick={handleCleanTest}
            disabled={cleanLoading || testCount === 0}
          >
            {cleanLoading ? <Loader size={14} className="data-spin" /> : <Trash2 size={14} />}
            {cleanLoading ? "Eliminando..." : "Eliminar todos los datos de prueba"}
          </button>
        </div>

        <p className="data-clean-note">
          Solo se eliminan documentos con el campo <code>esDePrueba: true</code>, que se agrega automáticamente
          al importar desde Excel. Los pedidos, ventas y usuarios reales nunca tienen ese campo.
        </p>
      </div>
    </div>
  );
}

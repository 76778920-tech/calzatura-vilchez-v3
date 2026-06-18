import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type CasoPrueba, type EvaluacionDetalle, type Funcion, type Transaccion } from "../api";
import { IndicatorInstrumentCard } from "../components/IndicatorInstrumentCard";
import { InternalComplianceChart } from "../components/InternalComplianceChart";
import { ScaleLegend } from "../components/ScaleLegend";

type Tab = "resumen" | "cf" | "cof" | "tecp";

export function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EvaluacionDetalle | null>(null);
  const [tab, setTab] = useState<Tab>("resumen");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    api.getEvaluacion(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  if (!id) return <p>ID inválido</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Cargando evaluación…</p>;

  const m = data.metricas;

  return (
    <div className="page">
      <header className="page-toolbar">
        <div>
          <Link to="/" className="back-link">← Panel de cumplimiento</Link>
          <h2 className="page-title">{data.codigo}</h2>
          <p className="lead">{data.titulo}</p>
        </div>
        <a href={api.pdfUrl(data.id)} className="btn primary" download>
          Descargar PDF
        </a>
      </header>

      <p className="panel-note muted">Al modificar registros en las pestañas CF, COF o TECP, los indicadores y gráficos se recalculan automáticamente.</p>

      <nav className="tabs">
        {(["resumen", "cf", "cof", "tecp"] as Tab[]).map((t) => (
          <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t === "resumen" ? "Resumen" : t === "cf" ? "Completitud" : t === "cof" ? "Corrección" : "Casos prueba"}
          </button>
        ))}
      </nav>

      {tab === "resumen" && (
        <>
          <InternalComplianceChart
            title="Cumplimiento interno — evaluación actual"
            overall={m.promedio_adecuacion}
            items={[
              { label: "CF", value: m.completitud_funcional.pct, level: m.completitud_funcional.classification.level },
              { label: "COF", value: m.correccion_funcional.pct, level: m.correccion_funcional.classification.level },
              { label: "TECP", value: m.tecp.pct, level: m.tecp.classification.level },
            ]}
          />
          <div className="instruments-grid">
            <IndicatorInstrumentCard indicatorId="cf" metric={m.completitud_funcional} numerator={m.completitud_funcional.funciones_implementadas} denominator={m.completitud_funcional.funciones_requeridas} funciones={data.funciones} />
            <IndicatorInstrumentCard indicatorId="cof" metric={m.correccion_funcional} numerator={m.correccion_funcional.transacciones_correctas} denominator={m.correccion_funcional.transacciones_evaluadas} transacciones={data.transacciones} />
            <IndicatorInstrumentCard indicatorId="tecp" metric={m.tecp} numerator={m.tecp.casos_aprobados} denominator={m.tecp.casos_ejecutados} casos={data.casos_prueba} />
          </div>
          <ScaleLegend />
        </>
      )}

      {tab === "cf" && (
        <SectionCF evalId={data.id} items={data.funciones} onSaved={load} />
      )}
      {tab === "cof" && (
        <SectionCOF evalId={data.id} items={data.transacciones} onSaved={load} />
      )}
      {tab === "tecp" && (
        <SectionTECP evalId={data.id} items={data.casos_prueba} onSaved={load} />
      )}
    </div>
  );
}

function SectionCF({ evalId, items, onSaved }: { evalId: string; items: Funcion[]; onSaved: () => void }) {
  const [form, setForm] = useState({ codigo_rf: "", modulo: "", nombre: "", requerida: true, implementada: false, evidencia: "" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api.saveFuncion(evalId, form);
    setForm({ codigo_rf: "", modulo: "", nombre: "", requerida: true, implementada: false, evidencia: "" });
    onSaved();
  };

  const toggle = async (f: Funcion) => {
    await api.saveFuncion(evalId, { ...f, implementada: !f.implementada });
    onSaved();
  };

  return (
    <section className="panel">
      <h2>Completitud Funcional — funciones requeridas</h2>
      <form className="form-grid" onSubmit={submit}>
        <input placeholder="Código RF (ej. RF-CAT-01)" value={form.codigo_rf} onChange={(e) => setForm({ ...form, codigo_rf: e.target.value })} required />
        <input placeholder="Módulo" value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} />
        <input placeholder="Nombre función" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="span-2" />
        <input placeholder="Evidencia (spec/test)" value={form.evidencia} onChange={(e) => setForm({ ...form, evidencia: e.target.value })} className="span-2" />
        <label><input type="checkbox" checked={form.requerida} onChange={(e) => setForm({ ...form, requerida: e.target.checked })} /> Requerida</label>
        <label><input type="checkbox" checked={form.implementada} onChange={(e) => setForm({ ...form, implementada: e.target.checked })} /> Implementada</label>
        <button type="submit" className="btn primary">Registrar función</button>
      </form>
      <table className="data-table">
        <thead><tr><th>RF</th><th>Módulo</th><th>Función</th><th>Implementada</th><th>Evidencia</th></tr></thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id}>
              <td>{f.codigo_rf}</td>
              <td>{f.modulo}</td>
              <td>{f.nombre}</td>
              <td><button type="button" className={`pill ${f.implementada ? "ok" : "no"}`} onClick={() => toggle(f)}>{f.implementada ? "Sí" : "No"}</button></td>
              <td className="muted">{f.evidencia}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SectionCOF({ evalId, items, onSaved }: { evalId: string; items: Transaccion[]; onSaved: () => void }) {
  const [form, setForm] = useState({ codigo: "", modulo: "", descripcion: "", evaluada: true, correcta: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api.saveTransaccion(evalId, form);
    setForm({ codigo: "", modulo: "", descripcion: "", evaluada: true, correcta: true });
    onSaved();
  };

  const setResult = async (t: Transaccion, correcta: boolean) => {
    await api.saveTransaccion(evalId, { ...t, evaluada: true, correcta });
    onSaved();
  };

  return (
    <section className="panel">
      <h2>Corrección Funcional — transacciones</h2>
      <form className="form-grid" onSubmit={submit}>
        <input placeholder="Código TX" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
        <input placeholder="Módulo" value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} />
        <input placeholder="Descripción transacción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required className="span-2" />
        <button type="submit" className="btn primary">Registrar transacción</button>
      </form>
      <table className="data-table">
        <thead><tr><th>Código</th><th>Descripción</th><th>Resultado</th></tr></thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>{t.codigo}</td>
              <td>{t.descripcion}</td>
              <td className="actions">
                <button type="button" className={`pill ${t.correcta ? "ok" : ""}`} onClick={() => setResult(t, true)}>Aprobado</button>
                <button type="button" className={`pill ${t.correcta === false ? "no" : ""}`} onClick={() => setResult(t, false)}>Rechazado</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SectionTECP({ evalId, items, onSaved }: { evalId: string; items: CasoPrueba[]; onSaved: () => void }) {
  const [form, setForm] = useState({ codigo: "", nombre: "", modulo: "", ejecutado: true, aprobado: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api.saveCaso(evalId, form);
    setForm({ codigo: "", nombre: "", modulo: "", ejecutado: true, aprobado: true });
    onSaved();
  };

  const setResult = async (c: CasoPrueba, aprobado: boolean) => {
    await api.saveCaso(evalId, { ...c, ejecutado: true, aprobado });
    onSaved();
  };

  return (
    <section className="panel">
      <h2>Tasa de Éxito — casos de prueba</h2>
      <form className="form-grid" onSubmit={submit}>
        <input placeholder="Código TC" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
        <input placeholder="Módulo" value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} />
        <input placeholder="Nombre caso" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="span-2" />
        <button type="submit" className="btn primary">Registrar caso</button>
      </form>
      <table className="data-table">
        <thead><tr><th>Código</th><th>Caso</th><th>Ejecutado</th><th>Resultado</th></tr></thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.codigo}</td>
              <td>{c.nombre}</td>
              <td>{c.ejecutado ? "Sí" : "No"}</td>
              <td className="actions">
                <button type="button" className={`pill ${c.aprobado ? "ok" : ""}`} onClick={() => setResult(c, true)}>Aprobado</button>
                <button type="button" className={`pill ${c.aprobado === false ? "no" : ""}`} onClick={() => setResult(c, false)}>Rechazado</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

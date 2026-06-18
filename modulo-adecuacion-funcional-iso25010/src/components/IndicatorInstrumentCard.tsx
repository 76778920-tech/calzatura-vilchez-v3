import { useState } from "react";
import { MEASUREMENT_INSTRUMENTS, type IndicatorId } from "../data/measurementInstruments";
import { ProgressBar } from "./ProgressBar";
import { StackedBarChart } from "./StackedBarChart";
import { formatPct } from "../utils/scale";
import type { CasoPrueba, Funcion, Transaccion } from "../api";

interface MetricSlice {
  pct: number | null;
  classification: { label: string; level: string };
}

interface Props {
  indicatorId: IndicatorId;
  metric: MetricSlice;
  numerator: number;
  denominator: number;
  funciones?: Funcion[];
  transacciones?: Transaccion[];
  casos?: CasoPrueba[];
}

function buildSegments(
  id: IndicatorId,
  funciones?: Funcion[],
  transacciones?: Transaccion[],
  casos?: CasoPrueba[],
) {
  if (id === "cf" && funciones) {
    const req = funciones.filter((f) => f.requerida);
    const ok = req.filter((f) => f.implementada).length;
    return [
      { label: "Implementadas", value: ok, tone: "ok" as const },
      { label: "Pendientes", value: req.length - ok, tone: "fail" as const },
    ];
  }
  if (id === "cof" && transacciones) {
    const ev = transacciones.filter((t) => t.evaluada);
    const ok = ev.filter((t) => t.correcta).length;
    return [
      { label: "Correctas", value: ok, tone: "ok" as const },
      { label: "Incorrectas", value: ev.length - ok, tone: "fail" as const },
      { label: "Sin evaluar", value: transacciones.length - ev.length, tone: "pending" as const },
    ];
  }
  if (id === "tecp" && casos) {
    const ex = casos.filter((c) => c.ejecutado);
    const ok = ex.filter((c) => c.aprobado).length;
    return [
      { label: "Aprobados", value: ok, tone: "ok" as const },
      { label: "Rechazados", value: ex.length - ok, tone: "fail" as const },
      { label: "Pendientes", value: casos.length - ex.length, tone: "pending" as const },
    ];
  }
  return [];
}

function ChecklistRows({
  id,
  funciones,
  transacciones,
  casos,
}: {
  id: IndicatorId;
  funciones?: Funcion[];
  transacciones?: Transaccion[];
  casos?: CasoPrueba[];
}) {
  type Row = { n: number; indicador: string; cumple: boolean; observacion: string };

  let rows: Row[] = [];
  if (id === "cf" && funciones?.length) {
    rows = funciones
      .filter((f) => f.requerida)
      .map((f, i) => ({
        n: i + 1,
        indicador: `${f.codigo_rf} — ${f.nombre}`,
        cumple: Boolean(f.implementada),
        observacion: f.evidencia || (f.implementada ? "Implementada con evidencia." : "Pendiente."),
      }));
  } else if (id === "cof" && transacciones?.length) {
    rows = transacciones.map((t, i) => ({
      n: i + 1,
      indicador: `${t.codigo} — ${t.descripcion}`,
      cumple: Boolean(t.evaluada && t.correcta),
      observacion: !t.evaluada ? "Sin evaluar." : t.correcta ? "Transacción correcta." : "Transacción incorrecta.",
    }));
  } else if (id === "tecp" && casos?.length) {
    rows = casos.map((c, i) => ({
      n: i + 1,
      indicador: `${c.codigo} — ${c.nombre}`,
      cumple: Boolean(c.ejecutado && c.aprobado),
      observacion: !c.ejecutado ? "Pendiente de ejecución." : c.aprobado ? "Caso aprobado." : "Caso rechazado.",
    }));
  }

  if (!rows.length) return <p className="muted">Sin ítems en la lista de cotejo.</p>;

  const si = rows.filter((r) => r.cumple).length;
  const no = rows.length - si;
  const pct = rows.length ? Math.round((si / rows.length) * 100) : 0;

  return (
    <div className="checklist-table-wrap">
      <table className="checklist-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Indicador</th>
            <th>Sí</th>
            <th>No</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n} className={r.cumple ? "row-si" : "row-no"}>
              <td className="col-n">{r.n}</td>
              <td className="col-ind">{r.indicador}</td>
              <td className="col-mark">{r.cumple ? "✓" : ""}</td>
              <td className="col-mark">{!r.cumple ? "✓" : ""}</td>
              <td className="col-obs">{r.observacion}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="checklist-total">
            <td colSpan={2}><strong>Total</strong></td>
            <td><strong>{si}</strong></td>
            <td><strong>{no}</strong></td>
            <td><strong>Resultado: {si}/{rows.length} = {pct}%</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function IndicatorInstrumentCard(props: Props) {
  const { indicatorId, metric, numerator, denominator } = props;
  const meta = MEASUREMENT_INSTRUMENTS[indicatorId];
  const [open, setOpen] = useState(false);
  const segments = buildSegments(indicatorId, props.funciones, props.transacciones, props.casos);

  return (
    <article className={`instrument-card level-border-${metric.classification.level}`}>
      <header className="instrument-head">
        <div>
          <span className="instrument-code">{meta.code}</span>
          <h3>{meta.title}</h3>
          <p className="instrument-iso">{meta.isoRef}</p>
        </div>
        <div className="instrument-score">
          <span className="instrument-pct">{formatPct(metric.pct)}</span>
          <span className={`badge level-${metric.classification.level}`}>{metric.classification.label}</span>
        </div>
      </header>

      <p className="instrument-formula">{meta.formula}</p>
      <ProgressBar value={metric.pct} label={`${numerator} / ${denominator} en cumplimiento`} level={metric.classification.level} />

      <dl className="instrument-meta">
        <div>
          <dt>Lista de cotejo</dt>
          <dd>{meta.instrument}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{meta.fuenteDatos}</dd>
        </div>
      </dl>

      {segments.length > 0 && (
        <StackedBarChart title={`Desglose ${meta.code}`} segments={segments} />
      )}

      <button type="button" className="btn-expand" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Ocultar detalle de registros" : "Ver registros de la lista de cotejo"}
      </button>

      {open && (
        <div className="instrument-detail">
          <div className="detail-block">
            <h4>Criterio de la lista de cotejo</h4>
            <p>{meta.procedimiento}</p>
            <p className="muted">{meta.umbrales}</p>
          </div>
          <div className="detail-block">
            <h4>Lista de cotejo — ítems registrados</h4>
            <ChecklistRows
              id={indicatorId}
              funciones={props.funciones}
              transacciones={props.transacciones}
              casos={props.casos}
            />
          </div>
        </div>
      )}
    </article>
  );
}

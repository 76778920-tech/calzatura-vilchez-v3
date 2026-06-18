import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { api, type Evaluacion, type EvaluacionDetalle } from "../api";

import { IndicatorInstrumentCard } from "../components/IndicatorInstrumentCard";

import { InternalComplianceChart } from "../components/InternalComplianceChart";

import { ScaleLegend } from "../components/ScaleLegend";



function sortEvaluaciones(list: (Evaluacion & { metricas: import("../api").Metricas })[]) {

  return [...list].sort((a, b) => {

    const da = a.fecha_evaluacion || "";

    const db = b.fecha_evaluacion || "";

    if (da !== db) return db.localeCompare(da);

    return b.codigo.localeCompare(a.codigo);

  });

}



export function DashboardPage() {

  const [list, setList] = useState<(Evaluacion & { metricas: import("../api").Metricas })[]>([]);

  const [detail, setDetail] = useState<EvaluacionDetalle | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  const load = () => {

    setLoading(true);

    setError("");

    api

      .listEvaluaciones()

      .then(async (rows) => {

        const sorted = sortEvaluaciones(rows);

        setList(sorted);

        if (sorted[0]) {

          const full = await api.getEvaluacion(sorted[0].id);

          setDetail(full);

        } else {

          setDetail(null);

        }

      })

      .catch((e) => setError(e.message))

      .finally(() => setLoading(false));

  };



  useEffect(load, []);



  const latest = useMemo(() => list[0], [list]);

  const m = detail?.metricas ?? latest?.metricas;



  return (

    <div className="page">

      <div className="page-toolbar">

        <div>

          <h2 className="page-title">Panel de cumplimiento interno</h2>

          <p className="lead">

            {latest

              ? `Evaluación activa: ${latest.codigo} · ${latest.periodo} · ${latest.evaluador || "—"}`

              : "Sin evaluación activa"}

          </p>

        </div>

        <div className="header-actions">

          <button type="button" className="btn secondary" onClick={() => api.seed().then(load)}>

            Recargar datos

          </button>

          <Link to="/nueva" className="btn primary">

            Nueva evaluación

          </Link>

        </div>

      </div>



      {loading && <div className="panel loading-panel">Calculando indicadores desde el registro…</div>}

      {error && <p className="error panel">{error}</p>}



      {!loading && !error && !latest && (

        <section className="panel empty-state">

          <h2>Sin evaluaciones</h2>

          <p>Registra una evaluación para activar los instrumentos de medición CF, COF y TECP.</p>

        </section>

      )}



      {m && latest && (

        <>

          <InternalComplianceChart

            title="Gráfico de barras — cumplimiento interno (Adecuación Funcional)"

            overall={m.promedio_adecuacion}

            items={[

              { label: "CF", value: m.completitud_funcional.pct, level: m.completitud_funcional.classification.level },

              { label: "COF", value: m.correccion_funcional.pct, level: m.correccion_funcional.classification.level },

              { label: "TECP", value: m.tecp.pct, level: m.tecp.classification.level },

            ]}

          />



          <section className="instruments-section">

            <h2 className="section-title">Indicadores y listas de cotejo (CF / COF / TECP)</h2>

            <p className="section-lead">

              Cada tarjeta muestra la lista de cotejo, la fórmula y el desglose calculado desde los registros marcados.

            </p>

            <div className="instruments-grid">

              <IndicatorInstrumentCard

                indicatorId="cf"

                metric={m.completitud_funcional}

                numerator={m.completitud_funcional.funciones_implementadas}

                denominator={m.completitud_funcional.funciones_requeridas}

                funciones={detail?.funciones}

              />

              <IndicatorInstrumentCard

                indicatorId="cof"

                metric={m.correccion_funcional}

                numerator={m.correccion_funcional.transacciones_correctas}

                denominator={m.correccion_funcional.transacciones_evaluadas}

                transacciones={detail?.transacciones}

              />

              <IndicatorInstrumentCard

                indicatorId="tecp"

                metric={m.tecp}

                numerator={m.tecp.casos_aprobados}

                denominator={m.tecp.casos_ejecutados}

                casos={detail?.casos_prueba}

              />

            </div>

          </section>



          <section className="panel meta-panel">

            <h3>Evaluación {latest.codigo}</h3>

            <p>{latest.titulo}</p>

            <p className="muted">{latest.observaciones}</p>

            <Link to={`/evaluacion/${latest.id}`} className="btn primary">

              Gestionar registros (CF / COF / TECP)

            </Link>

          </section>

        </>

      )}



      <section className="panel">

        <h2 className="section-title">Historial</h2>

        {list.length === 0 ? (

          <p className="muted">No hay registros.</p>

        ) : (

          <div className="table-wrap">

            <table className="data-table">

              <thead>

                <tr>

                  <th>Código</th>

                  <th>Periodo</th>

                  <th>CF</th>

                  <th>COF</th>

                  <th>TECP</th>

                  <th>Promedio</th>

                  <th />

                </tr>

              </thead>

              <tbody>

                {list.map((e) => (

                  <tr key={e.id}>

                    <td><strong>{e.codigo}</strong></td>

                    <td>{e.periodo}</td>

                    <td>{e.metricas.completitud_funcional.pct?.toFixed(1) ?? "N/D"}%</td>

                    <td>{e.metricas.correccion_funcional.pct?.toFixed(1) ?? "N/D"}%</td>

                    <td>{e.metricas.tecp.pct?.toFixed(1) ?? "N/D"}%</td>

                    <td>

                      <span className={`badge level-${e.metricas.promedio_classification.level}`}>

                        {e.metricas.promedio_adecuacion?.toFixed(1) ?? "N/D"}%

                      </span>

                    </td>

                    <td><Link to={`/evaluacion/${e.id}`}>Abrir</Link></td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>



      <ScaleLegend />

    </div>

  );

}


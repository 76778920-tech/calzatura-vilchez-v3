/** Panel de fórmulas de indicadores ISO/IEC 25010 */
export function IndicatorsFormulaPanel() {
  return (
    <section className="panel indicators-formulas" aria-label="Indicadores de medición">
      <h2>Indicadores de medición — Adecuación Funcional</h2>
      <div className="formula-grid">
        <article className="formula-card">
          <h3>CF — Completitud Funcional</h3>
          <p className="formula">CF = (Funciones implementadas ÷ Funciones requeridas) × 100</p>
          <p className="formula-note">ISO/IEC 25010 · Functional completeness</p>
        </article>
        <article className="formula-card">
          <h3>COF — Corrección Funcional</h3>
          <p className="formula">COF = (Transacciones correctas ÷ Transacciones evaluadas) × 100</p>
          <p className="formula-note">ISO/IEC 25010 · Functional correctness</p>
        </article>
        <article className="formula-card">
          <h3>TECP — Tasa de Éxito de Casos</h3>
          <p className="formula">TECP = (Casos aprobados ÷ Casos ejecutados) × 100</p>
          <p className="formula-note">Métrica de verificación · CU-T07 / pruebas</p>
        </article>
      </div>
    </section>
  );
}

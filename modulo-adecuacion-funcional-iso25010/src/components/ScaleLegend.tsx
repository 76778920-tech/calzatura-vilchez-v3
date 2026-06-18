export function ScaleLegend() {
  return (
    <section className="panel scale-legend">
      <h2>Escala de clasificación</h2>
      <ul>
        <li><span className="badge level-excellent">Excelente</span> 90% – 100%</li>
        <li><span className="badge level-good">Bueno</span> 80% – 89%</li>
        <li><span className="badge level-acceptable">Aceptable</span> 70% – 79%</li>
        <li><span className="badge level-deficient">Deficiente</span> &lt; 70%</li>
      </ul>
    </section>
  );
}

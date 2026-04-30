import { Link } from "react-router-dom";

const QUALITY_ROWS = [
  {
    characteristic: "Adecuación funcional",
    measure: "Tasa de tareas completadas",
    target: ">= 95%",
    evidence: "Flujo completo: búsqueda -> detalle -> carrito -> checkout -> historial",
  },
  {
    characteristic: "Eficiencia de desempeño",
    measure: "Tiempo de carga inicial",
    target: "<= 2.5 s",
    evidence: "Build optimizado con Vite, carga diferida por dominios y rutas lazy",
  },
  {
    characteristic: "Compatibilidad",
    measure: "Consistencia multi-dispositivo",
    target: "100% layouts responsivos críticos",
    evidence: "Breakpoints móviles/tablet/escritorio para home, catálogo, detalle y footer",
  },
  {
    characteristic: "Usabilidad",
    measure: "Éxito de navegación y comprensión",
    target: ">= 90%",
    evidence: "IA jerárquica, ayudas contextuales, acciones claras y feedback con toasts",
  },
  {
    characteristic: "Fiabilidad",
    measure: "Continuidad operativa ante fallos",
    target: "0 bloqueos críticos en uso normal",
    evidence: "Error boundary, validaciones y manejo de estado de carga/error en páginas críticas",
  },
  {
    characteristic: "Seguridad",
    measure: "Control de acceso por rol",
    target: "100% rutas sensibles protegidas",
    evidence: "RouteGuards, áreas (clientes/administradores) y reglas de backend",
  },
  {
    characteristic: "Mantenibilidad",
    measure: "Modularidad y facilidad de cambio",
    target: "Cambios localizados por dominio",
    evidence: "Arquitectura por dominios, componentes reutilizables y rutas centralizadas",
  },
  {
    characteristic: "Portabilidad",
    measure: "Despliegue reproducible",
    target: "Build estable en cada release",
    evidence: "Pipeline basado en `npm run build` con empaquetado consistente",
  },
] as const;

export default function ThesisIsoPage() {
  return (
    <main className="iso-page">
      <section className="iso-page-hero">
        <span className="page-kicker">Tesis · Calidad de Software</span>
        <h1>Cobertura ISO/IEC 25001 para Calzatura Vilchez</h1>
        <p>
          Este apartado documenta el plan de calidad y evaluación del producto software bajo ISO/IEC 25001,
          utilizando como referencia operativa las características del modelo de calidad del producto.
        </p>
      </section>

      <section className="iso-page-summary">
        <article>
          <h2>Alcance</h2>
          <p>Vitrina pública, catálogo, proceso de compra, perfil de cliente y panel administrativo.</p>
        </article>
        <article>
          <h2>Objetivo</h2>
          <p>Garantizar calidad medible, trazable y presentable académicamente en la sustentación de tesis.</p>
        </article>
        <article>
          <h2>Método</h2>
          <p>Definición de características, métricas, umbrales y evidencia verificable por cada criterio.</p>
        </article>
      </section>

      <section className="iso-page-table-wrap" aria-label="Matriz de calidad ISO">
        <table className="iso-page-table">
          <thead>
            <tr>
              <th>Característica</th>
              <th>Métrica</th>
              <th>Umbral</th>
              <th>Evidencia en el sistema</th>
            </tr>
          </thead>
          <tbody>
            {QUALITY_ROWS.map((row) => (
              <tr key={row.characteristic}>
                <td>{row.characteristic}</td>
                <td>{row.measure}</td>
                <td>{row.target}</td>
                <td>{row.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="iso-page-notes">
        <h2>Notas para sustentación</h2>
        <ul>
          <li>ISO/IEC 25001 se presenta como marco de planificación y gestión de evaluación de calidad.</li>
          <li>Los criterios aquí definidos se verifican con pruebas funcionales, revisión de rutas y evidencia de build.</li>
          <li>Se recomienda complementar con anexos de capturas, casos de prueba y resultados por iteración.</li>
        </ul>
      </section>

      <div className="iso-page-actions">
        <Link to="/" className="btn-ghost">Volver al inicio</Link>
        <Link to="/productos" className="btn-primary">Ver sistema en operación</Link>
      </div>
    </main>
  );
}

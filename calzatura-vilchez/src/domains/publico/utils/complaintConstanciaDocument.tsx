import { BUSINESS_CONTACT } from "@/config/businessContact";
import {
  formatConstanciaFecha,
  type ComplaintConstanciaSubmission,
} from "@/domains/publico/utils/complaintConstanciaTypes";

function row(label: string, value: string) {
  return (
    <tr key={label}>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  );
}

type ComplaintConstanciaDocumentProps = Readonly<{
  submission: ComplaintConstanciaSubmission;
}>;

/** Constancia imprimible conforme a libro de reclamaciones (Ley N.° 29571). */
export function ComplaintConstanciaDocument({ submission }: ComplaintConstanciaDocumentProps) {
  const tipoLabel = submission.tipo === "reclamo" ? "Reclamo" : "Queja";
  const tipoUpper = submission.tipo === "reclamo" ? "RECLAMO" : "QUEJA";
  const { fecha, hora } = formatConstanciaFecha(submission.submittedAt);
  const consumidor = `${submission.nombres} ${submission.apellidos}`.trim();

  return (
    <article className="complaint-constancia-document">
      <header className="complaint-constancia-header">
        <p className="complaint-constancia-eyebrow">Ley N.° 29571 — Código de Protección y Defensa del Consumidor</p>
        <h1>Constancia de registro</h1>
        <p className="complaint-constancia-subtitle">Libro de reclamaciones — formato virtual</p>
      </header>

      <section className="complaint-constancia-block" aria-labelledby="constancia-proveedor">
        <h2 id="constancia-proveedor">I. Proveedor del bien o servicio</h2>
        <table className="complaint-constancia-table">
          <tbody>
            {row("Razón social", BUSINESS_CONTACT.legalName)}
            {row("RUC", BUSINESS_CONTACT.rucDisplay)}
            {row("Domicilio", BUSINESS_CONTACT.address)}
            {row("Teléfono", BUSINESS_CONTACT.phoneDisplay)}
          </tbody>
        </table>
      </section>

      <section className="complaint-constancia-block" aria-labelledby="constancia-registro">
        <h2 id="constancia-registro">II. Datos del registro</h2>
        <table className="complaint-constancia-table">
          <tbody>
            {row("N.° de registro", submission.codigo)}
            {row("Fecha", fecha)}
            {row("Hora", hora)}
            {row("Tipo de hoja", `${tipoLabel} (${tipoUpper})`)}
            {row("Canal", "Formulario virtual — Web")}
          </tbody>
        </table>
      </section>

      <section className="complaint-constancia-block" aria-labelledby="constancia-consumidor">
        <h2 id="constancia-consumidor">III. Datos del consumidor reclamante</h2>
        <table className="complaint-constancia-table">
          <tbody>
            {row("Nombres y apellidos", consumidor)}
            {row("Documento de identidad (DNI)", submission.dni)}
            {row("Domicilio", submission.domicilio)}
            {row("Teléfono", submission.telefono)}
            {row("Correo electrónico", submission.email)}
          </tbody>
        </table>
      </section>

      <section className="complaint-constancia-block" aria-labelledby="constancia-bien">
        <h2 id="constancia-bien">IV. Bien o servicio contratado</h2>
        <table className="complaint-constancia-table">
          <tbody>
            {row("Descripción", submission.bienContratado)}
            {submission.monto ? row("Monto reclamado", `S/ ${submission.monto}`) : null}
            {submission.numeroPedido ? row("N.° de pedido (si aplica)", submission.numeroPedido) : null}
          </tbody>
        </table>
      </section>

      <section className="complaint-constancia-block" aria-labelledby="constancia-detalle">
        <h2 id="constancia-detalle">V. Detalle del {tipoLabel.toLowerCase()} y pedido del consumidor</h2>
        <div className="complaint-constancia-detail-box">{submission.detalle}</div>
      </section>

      <footer className="complaint-constancia-legal">
        <h2>VI. Información al consumidor</h2>
        <ul>
          <li>
            El proveedor dará respuesta al consumidor en un plazo no mayor de quince (15) días hábiles,
            prorrogables hasta por treinta (30) días calendario adicionales cuando el caso lo justifique.
          </li>
          <li>Se entregará acuse de recibo en un plazo máximo de tres (3) días hábiles desde la presentación.</li>
          <li>El trámite ante el libro de reclamaciones es gratuito para el consumidor.</li>
          <li>
            La presentación de esta hoja no impide acudir a otras vías de solución de controversias ni a
            Indecopi.
          </li>
        </ul>
        <p className="complaint-constancia-footnote">
          Documento generado electrónicamente por {BUSINESS_CONTACT.legalName} (RUC {BUSINESS_CONTACT.rucDisplay}
          ). Código de verificación: <strong>{submission.codigo}</strong>. Fecha de emisión: {fecha} — {hora}.
        </p>
      </footer>
    </article>
  );
}

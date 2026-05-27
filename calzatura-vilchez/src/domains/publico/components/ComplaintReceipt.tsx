import { useRef } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "@/components/common/ExternalLink";
import { BUSINESS_CONTACT } from "@/config/businessContact";
import { INFO_ROUTES } from "@/routes/paths";
import {
  buildComplaintWhatsAppUrl,
  type ComplaintFormData,
} from "@/domains/publico/utils/complaintBook";
import {
  buildComplaintReceiptPrintHtml,
  printHtmlDocument,
} from "@/domains/publico/utils/printComplaintReceipt";

type ComplaintReceiptProps = Readonly<{
  submission: ComplaintFormData & { codigo: string; submittedAt: string };
}>;

export function ComplaintReceipt({ submission }: ComplaintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const whatsappUrl = buildComplaintWhatsAppUrl(submission, submission.codigo);
  const tipoLabel = submission.tipo === "reclamo" ? "Reclamo" : "Queja";
  const fecha = new Date(submission.submittedAt).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    printHtmlDocument(
      buildComplaintReceiptPrintHtml(node.innerHTML, submission.codigo),
      `Constancia ${submission.codigo}`,
    );
  };

  return (
    <output className="complaint-book-success" aria-live="polite">
      <h3>Hoja registrada en el libro virtual</h3>
      <p className="complaint-book-code">
        Código de referencia: <strong>{submission.codigo}</strong>
      </p>
      <p>
        Tu hoja quedó registrada en nuestro libro de reclamaciones con fecha {fecha}. Conserva
        este código para seguimiento. Acuse de recibo en hasta 3 días hábiles; respuesta definitiva
        en hasta 30 días calendario. El trámite es gratuito.
      </p>
      <p>
        Si deseas, puedes reenviar el mismo contenido por WhatsApp para agilizar la atención. No
        es obligatorio si ya completaste este formulario.
      </p>

      <div ref={printRef} className="complaint-receipt-printable" hidden aria-hidden="true">
        <h1>Constancia — Libro de reclamaciones</h1>
        <p className="meta">
          {BUSINESS_CONTACT.legalName} · RUC {BUSINESS_CONTACT.rucDisplay} · {fecha}
        </p>
        <dl>
          <dt>Código</dt>
          <dd>{submission.codigo}</dd>
          <dt>Tipo</dt>
          <dd>{tipoLabel}</dd>
          <dt>Consumidor</dt>
          <dd>
            {submission.nombres} {submission.apellidos}
          </dd>
          <dt>DNI</dt>
          <dd>{submission.dni}</dd>
          <dt>Domicilio</dt>
          <dd>{submission.domicilio}</dd>
          <dt>Teléfono</dt>
          <dd>{submission.telefono}</dd>
          <dt>Correo</dt>
          <dd>{submission.email}</dd>
          <dt>Bien contratado</dt>
          <dd>{submission.bienContratado}</dd>
          {submission.monto ? (
            <>
              <dt>Monto</dt>
              <dd>S/ {submission.monto}</dd>
            </>
          ) : null}
          {submission.numeroPedido ? (
            <>
              <dt>N.° pedido</dt>
              <dd>{submission.numeroPedido}</dd>
            </>
          ) : null}
          <dt>Detalle y pedido</dt>
          <dd>{submission.detalle}</dd>
        </dl>
        <p className="foot">
          {BUSINESS_CONTACT.address} · {BUSINESS_CONTACT.phoneDisplay}
        </p>
      </div>

      <div className="complaint-book-success-actions">
        <ExternalLink href={whatsappUrl} className="btn-primary">
          Enviar copia por WhatsApp (opcional)
        </ExternalLink>
        <button type="button" className="btn-ghost" onClick={handlePrint}>
          Imprimir constancia
        </button>
      </div>
      <p className="complaint-book-note">
        También puedes acudir a{" "}
        <ExternalLink href={BUSINESS_CONTACT.indecopiUrl}>Indecopi</ExternalLink>. Datos personales
        según nuestra <Link to={INFO_ROUTES.legalPrivacidad}>Política de privacidad</Link>.
      </p>
    </output>
  );
}

import { Link } from "react-router-dom";
import { ExternalLink } from "@/components/common/ExternalLink";
import { INFO_ROUTES } from "@/routes/paths";
import {
  buildComplaintWhatsAppUrl,
  type ComplaintFormData,
} from "@/domains/publico/utils/complaintBook";
import { ComplaintConstanciaDocument } from "@/domains/publico/utils/complaintConstanciaDocument";
import { complaintPlazosResumenCorto } from "@/domains/publico/utils/complaintLegalPlazos";
import { printComplaintConstancia } from "@/domains/publico/utils/printComplaintConstancia";

type ComplaintReceiptProps = Readonly<{
  submission: ComplaintFormData & { codigo: string; submittedAt: string };
}>;

export function ComplaintReceipt({ submission }: ComplaintReceiptProps) {
  const whatsappUrl = buildComplaintWhatsAppUrl(submission, submission.codigo);
  const fecha = new Date(submission.submittedAt).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <output className="complaint-book-success" aria-live="polite">
      <div className="complaint-book-success-screen">
        <h3>Hoja registrada en el libro virtual</h3>
        <p className="complaint-book-code">
          Código de referencia: <strong>{submission.codigo}</strong>
        </p>
        <p>
          Tu hoja quedó registrada en nuestro libro de reclamaciones con fecha {fecha}. Conserva
          este código para seguimiento. {complaintPlazosResumenCorto()} El trámite es gratuito.
        </p>
        <p>
          Revisa la constancia siguiente. Puedes imprimirla o guardarla como PDF desde el diálogo
          de impresión del navegador. Si indicaste un correo electrónico válido, también te enviaremos
          un mensaje con este código y los plazos legales.
        </p>

        <div className="complaint-book-success-actions">
          <ExternalLink href={whatsappUrl} className="btn-primary">
            Enviar copia por WhatsApp (opcional)
          </ExternalLink>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => printComplaintConstancia(submission)}
          >
            Imprimir o guardar PDF
          </button>
        </div>
        <p className="complaint-book-note">
          También puedes acudir a{" "}
          <ExternalLink href="https://www.indecopi.gob.pe/">Indecopi</ExternalLink>. Datos personales
          según nuestra <Link to={INFO_ROUTES.legalPrivacidad}>Política de privacidad</Link>.
        </p>
      </div>

      <div className="complaint-receipt-preview" aria-label="Vista previa de la constancia">
        <ComplaintConstanciaDocument submission={submission} />
      </div>
    </output>
  );
}

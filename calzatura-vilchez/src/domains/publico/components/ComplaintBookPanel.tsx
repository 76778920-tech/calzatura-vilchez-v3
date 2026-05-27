import { Link } from "react-router-dom";
import { MapPin, MessageCircle, FileText } from "lucide-react";
import { ExternalLink } from "@/components/common/ExternalLink";
import { BUSINESS_CONTACT } from "@/config/businessContact";
import { INFO_ROUTES } from "@/routes/paths";
import { COMPLAINT_WHATSAPP_SIMPLE_URL } from "@/domains/publico/utils/complaintBook";
import { ComplaintBookForm } from "@/domains/publico/components/ComplaintBookForm";
import { ComplaintProviderCard } from "@/domains/publico/components/ComplaintProviderCard";

/**
 * Canales de presentación alineados al uso real en Perú: tienda física y WhatsApp primero;
 * formulario web como opción para quien prefiera constancia estructurada.
 */
export function ComplaintBookPanel() {
  return (
    <div className="complaint-book-panel">
      <ComplaintProviderCard />

      <div className="complaint-book-channels" role="list">
        <article className="complaint-book-channel complaint-book-channel--primary" role="listitem">
          <span className="complaint-book-channel-icon" aria-hidden="true">
            <MapPin size={22} />
          </span>
          <h3>En tienda (recomendado)</h3>
          <p>
            Solicita la hoja impresa en {BUSINESS_CONTACT.address}. Horario: {BUSINESS_CONTACT.hours}.
            Te entregamos copia o constancia de recepción en el momento.
          </p>
          <Link to="/tiendas" className="btn-ghost complaint-book-channel-btn">
            Ver ubicación
          </Link>
        </article>

        <article className="complaint-book-channel" role="listitem">
          <span className="complaint-book-channel-icon" aria-hidden="true">
            <MessageCircle size={22} />
          </span>
          <h3>Por WhatsApp</h3>
          <p>
            Escribe con tus datos y el detalle del caso. Es el canal más usado si no puedes acudir
            presencialmente. Te responderemos por el mismo medio.
          </p>
          <ExternalLink
            href={COMPLAINT_WHATSAPP_SIMPLE_URL}
            className="btn-primary complaint-book-channel-btn"
          >
            Abrir WhatsApp
          </ExternalLink>
        </article>

        <article className="complaint-book-channel" role="listitem">
          <span className="complaint-book-channel-icon" aria-hidden="true">
            <FileText size={22} />
          </span>
          <h3>Formulario virtual</h3>
          <p>
            Opcional. Registra la hoja en nuestro libro virtual con código de referencia y constancia
            imprimible. Puedes complementar por WhatsApp si lo deseas.
          </p>
        </article>
      </div>

      <details className="complaint-book-virtual">
        <summary>Usar formulario virtual (opcional)</summary>
        <ComplaintBookForm />
      </details>

      <p className="complaint-book-note">
        Trámite gratuito. Plazos: acuse de recibo hasta 3 días hábiles; respuesta hasta 30 días
        calendario. También puedes acudir a{" "}
        <ExternalLink href="https://www.indecopi.gob.pe/">Indecopi</ExternalLink>. Datos personales
        según nuestra <Link to={INFO_ROUTES.legalPrivacidad}>Política de privacidad</Link>.
      </p>
    </div>
  );
}

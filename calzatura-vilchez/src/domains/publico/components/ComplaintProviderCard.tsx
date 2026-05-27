import { BUSINESS_CONTACT } from "@/config/businessContact";
import { ExternalLink } from "@/components/common/ExternalLink";

/** Identificación del proveedor exigida en libro de reclamaciones (Ley 29571). */
export function ComplaintProviderCard() {
  const c = BUSINESS_CONTACT;
  return (
    <aside className="complaint-provider-card" aria-labelledby="complaint-provider-heading">
      <h2 id="complaint-provider-heading" className="complaint-provider-title">
        Proveedor del servicio
      </h2>
      <dl className="complaint-provider-dl">
        <div>
          <dt>Razón social</dt>
          <dd>{c.legalName}</dd>
        </div>
        <div>
          <dt>RUC</dt>
          <dd>{c.rucDisplay}</dd>
        </div>
        <div>
          <dt>Domicilio</dt>
          <dd>{c.address}</dd>
        </div>
        <div>
          <dt>Atención</dt>
          <dd>
            <ExternalLink href={c.whatsappBaseUrl}>{c.phoneDisplay}</ExternalLink>
            <span className="complaint-provider-hours"> · {c.hours}</span>
          </dd>
        </div>
      </dl>
    </aside>
  );
}

import { Link } from "react-router-dom";
import { CookiePolicyProse } from "@/components/cookies/CookiePolicyProse";
import { ComplaintBookPanel } from "@/domains/publico/components/ComplaintBookPanel";
import {
  INFO_CONTENT,
  infoContentEntries,
  LEGAL_PROSE_PAGE_KEYS,
  PAGE_ROUTE_MAP,
  type InfoContent,
  type InfoPageKey,
} from "@/domains/publico/content/infoPagesContent";

type Props = Readonly<{
  pageKey: InfoPageKey;
}>;

function InfoBodyParagraphs({ paragraphs }: Readonly<{ paragraphs: string[] }>) {
  return paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

function InfoProseSections({
  pageKey,
  sections,
  title,
}: Readonly<{
  pageKey: InfoPageKey;
  sections: InfoContent["sections"];
  title: string;
}>) {
  return (
    <article className="info-page-prose" aria-label={title}>
      {sections.map((section) => (
        <section key={section.title} className="info-page-prose-section">
          <h2>{section.title}</h2>
          <InfoBodyParagraphs paragraphs={section.body} />
          {pageKey === "libroReclamaciones" && section.title.startsWith("5. Presentar") ? (
            <ComplaintBookPanel />
          ) : null}
        </section>
      ))}
      {pageKey === "politicaCookies" ? (
        <section className="info-page-prose-section">
          <h2>10. Inventario de cookies y almacenamiento</h2>
          <p>
            La siguiente relación complementa las secciones anteriores y tiene carácter informativo.
            No sustituye el panel interactivo de «Configuración de cookies», donde puedes activar o
            desactivar las categorías que requieren consentimiento. Los nombres comerciales indicados
            buscan facilitar tu comprensión y no constituyen una lista exhaustiva de identificadores
            técnicos internos.
          </p>
          <CookiePolicyProse />
        </section>
      ) : null}
    </article>
  );
}

function InfoGridSections({ sections }: Readonly<{ sections: InfoContent["sections"] }>) {
  return (
    <section className="info-page-grid">
      {sections.map((section) => (
        <article key={section.title} className="info-page-card">
          <h2>{section.title}</h2>
          <div className="info-page-card-copy">
            <InfoBodyParagraphs paragraphs={section.body} />
          </div>
        </article>
      ))}
    </section>
  );
}

function InfoFaqSection({ faq }: Readonly<{ faq: NonNullable<InfoContent["faq"]> }>) {
  return (
    <section className="info-page-faq" aria-label="Preguntas frecuentes de la página">
      <h2>Preguntas frecuentes</h2>
      <div className="info-page-faq-grid">
        {faq.map((item) => (
          <article key={item.question} className="info-page-faq-card">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function InfoPage({ pageKey }: Props) {
  const content = INFO_CONTENT[pageKey];
  const isLegalProse = LEGAL_PROSE_PAGE_KEYS.has(pageKey);
  const relatedPages = infoContentEntries()
    .filter(([key, page]) => page.group === content.group && key !== pageKey)
    .map(([key, page]) => ({
      key,
      title: page.title,
      to: PAGE_ROUTE_MAP[key],
    }));

  return (
    <main className={`info-page info-page--${content.group}`}>
      <section className="info-page-hero">
        <span className="page-kicker">{content.kicker}</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <div className="info-page-accent">
          <strong>{content.accent}</strong>
          <span>{content.note}</span>
        </div>
      </section>

      {content.highlights.length > 0 ? (
        <section className="info-page-highlights" aria-label="Aspectos clave">
          {content.highlights.map((highlight) => (
            <article key={highlight} className="info-page-highlight-chip">
              {highlight}
            </article>
          ))}
        </section>
      ) : null}

      <div className={`info-page-main${isLegalProse ? " info-page-main--prose" : ""}`}>
        {isLegalProse ? (
          <InfoProseSections pageKey={pageKey} sections={content.sections} title={content.title} />
        ) : (
          <InfoGridSections sections={content.sections} />
        )}

        <aside className="info-page-aside">
          <article className="info-page-aside-card">
            <h3>En esta sección</h3>
            <div className="info-page-aside-links">
              {relatedPages.length > 0 ? (
                relatedPages.map((page) => (
                  <Link key={page.key} to={page.to} className="info-page-aside-link">
                    {page.title}
                  </Link>
                ))
              ) : (
                <span className="info-page-aside-empty">No hay páginas relacionadas por ahora.</span>
              )}
            </div>
          </article>
          <article className="info-page-aside-card">
            <h3>Acciones rápidas</h3>
            <div className="info-page-aside-actions">
              <Link to="/productos" className="btn-primary">
                Explorar catálogo
              </Link>
              <Link to="/tiendas" className="btn-ghost">
                Visitar tienda física
              </Link>
            </div>
          </article>
        </aside>
      </div>

      {content.faq && content.faq.length > 0 && !isLegalProse ? (
        <InfoFaqSection faq={content.faq} />
      ) : null}
    </main>
  );
}

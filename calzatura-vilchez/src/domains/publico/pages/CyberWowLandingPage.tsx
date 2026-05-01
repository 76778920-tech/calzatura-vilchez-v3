import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { buildCyberCatalogHref, CATALOG_SHELF } from "@/routes/catalogRouting";
import { INFO_ROUTES } from "@/routes/paths";

export default function CyberWowLandingPage() {
  return (
    <main className="info-page info-page--beneficios">
      <section className="info-page-hero">
        <div className="info-page-accent">
          <p>
            <Sparkles size={16} style={{ verticalAlign: "text-bottom", marginRight: "0.35rem" }} aria-hidden />
            Campaña editorial
          </p>
          <h1>Cyber Wow 2026</h1>
          <p>
            Ofertas seleccionadas en calzado para mujer, hombre e infantil. Esta página es una entrada de campaña; el
            catálogo filtrado usa la URL canónica del listado.
          </p>
        </div>
      </section>
      <div className="info-page-actions">
        <Link to={buildCyberCatalogHref({ campana: "cyber" })} className="btn-primary">
          Ver todo Cyber Wow
        </Link>
        <Link to={buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" })} className="btn-outline">
          Cyber Mujer
        </Link>
        <Link to={CATALOG_SHELF.products} className="btn-outline">
          Catálogo general
        </Link>
      </div>
      <p style={{ maxWidth: "820px", margin: "1.5rem auto 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
        Condiciones comerciales y envíos: revisa <Link to={INFO_ROUTES.beneficiosCuotas}>beneficios y cuotas</Link>.
      </p>
    </main>
  );
}

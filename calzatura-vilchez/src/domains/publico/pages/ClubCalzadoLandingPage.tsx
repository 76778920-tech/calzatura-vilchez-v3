import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { buildCatalogHref } from "@/routes/catalogRouting";
import { INFO_ROUTES } from "@/routes/paths";

export default function ClubCalzadoLandingPage() {
  return (
    <main className="info-page info-page--beneficios">
      <section className="info-page-hero">
        <div className="info-page-accent">
          <p>
            <Heart size={16} style={{ verticalAlign: "text-bottom", marginRight: "0.35rem" }} aria-hidden />
            Club Vilchez · calzado
          </p>
          <h1>Club Vilchez Calzado</h1>
          <p>
            Punto de entrada editorial hacia el catálogo. El detalle de beneficios sigue en la ficha informativa del
            club; aquí enlazamos directo a productos.
          </p>
        </div>
      </section>
      <div className="info-page-actions">
        <Link to={buildCatalogHref({ vista: "marcas", marcaSlug: "calzatura-vilchez" })} className="btn-primary">
          Ver marca Calzatura Vilchez
        </Link>
        <Link to={buildCatalogHref({ categoria: "mujer" })} className="btn-outline">
          Calzado mujer
        </Link>
        <Link to={INFO_ROUTES.beneficiosClubVilchez} className="btn-outline">
          Beneficios del club
        </Link>
      </div>
    </main>
  );
}

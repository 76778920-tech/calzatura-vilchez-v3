import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { InfoEditorialLanding } from "@/domains/publico/components/InfoEditorialLanding";
import { buildCyberCatalogHref, CATALOG_SHELF } from "@/routes/catalogRouting";
import { INFO_ROUTES } from "@/routes/paths";

export default function CyberWowLandingPage() {
  return (
    <InfoEditorialLanding
      icon={Sparkles}
      kicker="Campaña editorial"
      title="Cyber Wow 2026"
      intro="Ofertas seleccionadas en calzado para mujer, hombre e infantil. Esta página es una entrada de campaña; el catálogo filtrado usa la URL canónica del listado."
      actions={[
        { to: buildCyberCatalogHref({ campana: "cyber" }), label: "Ver todo Cyber Wow", variant: "primary" },
        { to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" }), label: "Cyber Mujer", variant: "outline" },
        { to: CATALOG_SHELF.products, label: "Catálogo general", variant: "outline" },
      ]}
      footnote={
        <p style={{ maxWidth: "820px", margin: "1.5rem auto 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Condiciones comerciales y envíos: revisa <Link to={INFO_ROUTES.beneficiosCuotas}>beneficios y cuotas</Link>.
        </p>
      }
    />
  );
}

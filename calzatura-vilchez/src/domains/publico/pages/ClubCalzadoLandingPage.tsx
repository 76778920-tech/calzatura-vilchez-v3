import { Heart } from "lucide-react";
import { InfoEditorialLanding } from "@/domains/publico/components/InfoEditorialLanding";
import { buildCatalogHref } from "@/routes/catalogRouting";
import { INFO_ROUTES } from "@/routes/paths";

export default function ClubCalzadoLandingPage() {
  return (
    <InfoEditorialLanding
      icon={Heart}
      kicker="Club Vilchez · calzado"
      title="Club Vilchez Calzado"
      intro="Punto de entrada editorial hacia el catálogo. El detalle de beneficios sigue en la ficha informativa del club; aquí enlazamos directo a productos."
      actions={[
        {
          to: buildCatalogHref({ vista: "marcas", marcaSlug: "calzatura-vilchez" }),
          label: "Ver marca Calzatura Vilchez",
          variant: "primary",
        },
        { to: buildCatalogHref({ categoria: "mujer" }), label: "Calzado mujer", variant: "outline" },
        { to: INFO_ROUTES.beneficiosClubVilchez, label: "Beneficios del club", variant: "outline" },
      ]}
    />
  );
}

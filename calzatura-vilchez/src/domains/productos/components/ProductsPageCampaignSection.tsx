import { useMemo } from "react";
import {
  cyberWowJuvenilEditorial,
  cyberWowZapatillasEditorial,
} from "@/constants/cloudinaryHomeImages";
import { useCatalogCampaignCarousel } from "@/domains/productos/hooks/useCatalogCampaignCarousel";
import { CATALOG_CAMPAIGN_ROTATION_MS } from "@/domains/productos/pages/productsPageConstants";

type Props = Readonly<{
  pageTitle: string;
  pageSubtitle: string;
  sectionLabel: string;
  visibleBrandCount: number;
  catalogDescriptionId: string;
}>;

export function ProductsPageCampaignSection({
  pageTitle,
  pageSubtitle,
  sectionLabel,
  visibleBrandCount,
  catalogDescriptionId,
}: Props) {
  const catalogCampaignSlides = useMemo(
    () => [
      {
        id: "juvenil",
        image: cyberWowJuvenilEditorial,
        alt: "Campaña CYBER WOW juvenil con composición de calzado al lado derecho y espacio libre al lado izquierdo.",
      },
      {
        id: "zapatillas",
        image: cyberWowZapatillasEditorial,
        alt: "Campaña CYBER WOW de zapatillas con composición de calzado al lado izquierdo y espacio libre al lado derecho.",
      },
    ],
    [],
  );

  const {
    activeCampaignSlide,
    isCampaignDragging,
    campaignTrackRef,
    handleCampaignPointerDown,
    handleCampaignPointerMove,
    handleCampaignPointerUp,
    handleCampaignPointerCancel,
    handleCampaignAnimationEnd,
    getCampaignSlideClassName,
    getCampaignSlideStyle,
  } = useCatalogCampaignCarousel(catalogCampaignSlides, CATALOG_CAMPAIGN_ROTATION_MS);

  return (
    <section className="catalog-campaign-shell" aria-label={pageTitle} aria-describedby={catalogDescriptionId}>
      <p id={catalogDescriptionId} className="sr-only">
        {`${pageSubtitle} ${sectionLabel}. ${visibleBrandCount || 0} marcas visibles.`}
      </p>
      <div
        ref={campaignTrackRef}
        className={`catalog-campaign-track ${isCampaignDragging ? "is-dragging" : ""}`}
        onPointerDown={handleCampaignPointerDown}
        onPointerMove={handleCampaignPointerMove}
        onPointerUp={handleCampaignPointerUp}
        onPointerCancel={handleCampaignPointerCancel}
      >
        {catalogCampaignSlides.map((slide, index) => (
          <article
            key={slide.id}
            className={getCampaignSlideClassName(index)}
            style={getCampaignSlideStyle(index)}
            onAnimationEnd={() => handleCampaignAnimationEnd(index)}
          >
            <img
              className="catalog-campaign-image"
              src={slide.image}
              alt={slide.alt}
              loading={index === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </article>
        ))}
      </div>
      <progress
        className="catalog-campaign-progress"
        aria-label="Progreso de campañas"
        aria-valuenow={activeCampaignSlide + 1}
        value={activeCampaignSlide + 1}
        max={catalogCampaignSlides.length}
      />
    </section>
  );
}

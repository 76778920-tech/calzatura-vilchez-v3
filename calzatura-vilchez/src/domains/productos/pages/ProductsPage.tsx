import { useEffect, useId, useMemo, useRef } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { CATALOG_SHELF } from "@/routes/catalogRouting";
import { ProductsPageCampaignSection } from "@/domains/productos/components/ProductsPageCampaignSection";
import { ProductsPageControlShell } from "@/domains/productos/components/ProductsPageControlShell";
import { useCatalogFacetPopovers } from "@/domains/productos/hooks/useCatalogFacetPopovers";
import { useCatalogNavigation } from "@/domains/productos/hooks/useCatalogNavigation";
import { useCatalogRouteParams } from "@/domains/productos/hooks/useCatalogRouteParams";
import { useProductsPageCatalogData } from "@/domains/productos/hooks/useProductsPageCatalogData";
import { useProductsPageCatalogModel } from "@/domains/productos/hooks/useProductsPageCatalogModel";
import { buildProductsPageMainContent } from "@/domains/productos/pages/productsPageMainContent";
import { CATALOG_PAGE_SIZE } from "@/domains/productos/pages/productsPageConstants";

export default function ProductsPage() {
  useDocumentTitle("Productos");
  const catalogDescriptionId = useId();
  const closeMenusRef = useRef<() => void>(() => {});

  const {
    effectiveParams,
    navigate,
    categoria,
    vista,
    campana,
    coleccion,
    estilo,
    tipo,
    linea,
    segmento,
    color,
    promocion,
    rangoEdad,
    precio,
    talla,
    material,
    descuento,
    trimmedQuery,
    marca,
    marcaSlug,
    cyberShelfParams,
    catalogPage,
    setCatalogPage,
  } = useCatalogRouteParams();

  const {
    products,
    browse,
    familyGroupCounts,
    loading,
    error,
    handleRetry,
    useBffBrowse,
  } = useProductsPageCatalogData(effectiveParams, catalogPage);

  const route = useMemo(
    () => ({
      categoria,
      vista,
      marca,
      marcaSlug,
      campana,
      promocion,
      coleccion,
      estilo,
      tipo,
      linea,
      segmento,
      color,
      rangoEdad,
      precio,
      talla,
      material,
      descuento,
      trimmedQuery,
    }),
    [
      categoria,
      vista,
      marca,
      marcaSlug,
      campana,
      promocion,
      coleccion,
      estilo,
      tipo,
      linea,
      segmento,
      color,
      rangoEdad,
      precio,
      talla,
      material,
      descuento,
      trimmedQuery,
    ],
  );

  const navigation = useCatalogNavigation(effectiveParams, navigate, () => closeMenusRef.current());

  const model = useProductsPageCatalogModel({
    products,
    browse,
    useBffBrowse,
    catalogPage,
    route,
    applyFacetFilter: navigation.applyFacetFilter,
  });

  const menuDraftContext = useMemo(
    () => ({
      precio,
      talla,
      color,
      material,
      descuento,
      priceBounds: model.priceBounds,
      availableSizes: model.availableSizes,
      availableColors: model.availableColors,
      availableMaterials: model.availableMaterials,
    }),
    [
      precio,
      talla,
      color,
      material,
      descuento,
      model.priceBounds,
      model.availableSizes,
      model.availableColors,
      model.availableMaterials,
    ],
  );

  const popovers = useCatalogFacetPopovers(menuDraftContext);
  useEffect(() => {
    closeMenusRef.current = popovers.closeMenus;
  }, [popovers.closeMenus]);

  const productsMainContent = buildProductsPageMainContent({
    loading,
    error,
    hasAnyProducts: model.hasAnyProducts,
    trimmedQuery,
    pagedProducts: model.pagedProducts,
    familyGroupCounts,
    catalogTotal: model.catalogTotal,
    catalogPage,
    totalCatalogPages: model.totalCatalogPages,
    pageSize: CATALOG_PAGE_SIZE,
    onRetry: handleRetry,
    onGoToFullCatalog: () => navigate(CATALOG_SHELF.products),
    onPageChange: setCatalogPage,
  });

  return (
    <main className="products-page products-page-modern">
      <ProductsPageCampaignSection
        pageTitle={model.pageTitle}
        pageSubtitle={model.pageSubtitle}
        sectionLabel={model.sectionLabel}
        visibleBrandCount={model.visibleBrandCount}
        catalogDescriptionId={catalogDescriptionId}
      />

      <ProductsPageControlShell
        breadcrumbs={model.breadcrumbs}
        primaryFilters={model.primaryFilters}
        contextualFilters={model.contextualFilters}
        showContextualFilterGroup={model.showContextualFilterGroup}
        campana={campana}
        cyberShelfParams={cyberShelfParams}
        filterMenus={model.filterMenus}
        activeFacets={model.activeFacets}
        marcas={model.marcas}
        availableSizes={model.availableSizes}
        availableColors={model.availableColors}
        availableMaterials={model.availableMaterials}
        priceBounds={model.priceBounds}
        isQuickFilterActive={navigation.isQuickFilterActive}
        applySectionFilter={navigation.applySectionFilter}
        popovers={popovers}
      />

      <div className="products-main">{productsMainContent}</div>
    </main>
  );
}

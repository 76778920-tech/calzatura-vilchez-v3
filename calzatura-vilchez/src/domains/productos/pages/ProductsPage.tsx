import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  buildCanonicalCatalogLocation,
  CATALOG_ROUTE_PARAM_KEYS,
  CATALOG_SHELF,
  getCatalogCanonicalRedirect,
  mergeCatalogSearchParams,
} from "@/routes/catalogRouting";
import { AlertTriangle, ChevronRight, X } from "lucide-react";
import { fetchProductFamilyGroupCounts, fetchPublicProducts } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import ProductCard from "@/domains/productos/components/ProductCard";
import cyberWowJuvenilEditorial from "@/assets/home/cyber/cyber-wow-juvenil-editorial.png";
import cyberWowZapatillasEditorial from "@/assets/home/cyber/cyber-wow-zapatillas-editorial.png";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import { slugifyCatalogValue, toPublicCategorySlug } from "@/utils/catalog";
import { categoryLabel } from "@/utils/labels";
import { effectiveFamiliaKey } from "@/utils/productFamily";
import { CatalogFilterRail } from "@/domains/productos/components/CatalogFilterRail";
import {
  buildActiveCatalogFacetChips,
  buildCatalogBreadcrumbs,
  buildContextualCatalogFilters,
  buildFacetFilteredCatalogProducts,
  buildRouteFilteredCatalogProducts,
  DISCOUNT_OPTIONS,
  filterParsedColorsForCatalogDraft,
  filterParsedMaterialsForCatalogDraft,
  filterParsedSizesForCatalogDraft,
  getPriceLabel,
  getProductSizes,
  humanizeSlug,
  MATERIAL_FILTER_ORDER,
  MATERIAL_RULES,
  parseColorSelection,
  parseDiscountSelection,
  parseMaterialSelection,
  parsePriceRange,
  parseSizeSelection,
  resolveProductsPageTitle,
  toggleCatalogStringListMember,
  type CatalogFilterGroup,
} from "@/domains/productos/utils/productsPageCatalogDerivations";

const CATALOG_CAMPAIGN_ROTATION_MS = 9000;

type FilterOption = {
  label: string;
  value: string;
};

type FilterMenuConfig = {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
};

const CYBER_DISCOUNT_PILL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Todo Cyber Wow", value: "all" },
  { label: "10 %", value: "10" },
  { label: "20 %", value: "20" },
  { label: "30 %", value: "30" },
];

const COLOR_SWATCH_MAP: Record<string, string> = {
  negro: "#000000",
  blanco: "#f5f4f0",
  nude: "#d9d7b2",
  camel: "#bd7013",
  multicolor: "linear-gradient(90deg, #ff0000, #ff8c00, #ffee00, #00c853, #00b0ff, #3d00ff)",
  gris: "#8e8e8e",
  dorado: "#d4b11a",
  plata: "#bfbfbf",
  morado: "#a046bd",
  "azul-claro": "#9bc5d3",
  azul: "#322fb0",
  verde: "#0f8d0f",
  chocolate: "#8b5a07",
  marron: "#7b4b2a",
  rojo: "#ff2b1a",
  rosa: "#e9aaa7",
  "cafe-claro": "#c9aa58",
  guinda: "#6f1f2b",
  "petroleo-oscuro": "#27464c",
  "rose-gold": "#bf9f8c",
  amarillo: "#e5df2a",
  "verde-agua": "#13a394",
};

const COLOR_SWATCH_ORDER = [
  "negro",
  "blanco",
  "nude",
  "camel",
  "multicolor",
  "gris",
  "dorado",
  "plata",
  "morado",
  "azul-claro",
  "azul",
  "verde",
  "chocolate",
  "marron",
  "rojo",
  "rosa",
  "cafe-claro",
  "guinda",
  "petroleo-oscuro",
  "rose-gold",
  "amarillo",
  "verde-agua",
] as const;

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();
  const effectiveParams = useMemo(
    () => mergeCatalogSearchParams(location.pathname, routeParams, searchParams),
    [location.pathname, routeParams, searchParams]
  );

  useEffect(() => {
    const target = getCatalogCanonicalRedirect(location.pathname, location.search, routeParams);
    if (!target) return;
    navigate(`${target.pathname}${target.search}`, { replace: true });
  }, [location.pathname, location.search, routeParams, navigate]);
  const [products, setProducts] = useState<Product[]>([]);
  const [familyGroupCounts, setFamilyGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  useProductsRealtime(() => setReloadToken((t) => t + 1));
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeCampaignSlide, setActiveCampaignSlide] = useState(0);
  const [draftPriceMin, setDraftPriceMin] = useState(0);
  const [draftPriceMax, setDraftPriceMax] = useState(0);
  const [pricePopoverStyle, setPricePopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const filterRailRef = useRef<HTMLDivElement | null>(null);
  const priceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pricePopoverRef = useRef<HTMLDivElement | null>(null);
  const pricePopoverFrameRef = useRef<number | null>(null);
  const [draftSelectedSizes, setDraftSelectedSizes] = useState<string[]>([]);
  const [sizePopoverStyle, setSizePopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const sizeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sizePopoverRef = useRef<HTMLDivElement | null>(null);
  const sizePopoverFrameRef = useRef<number | null>(null);
  const campaignTrackRef = useRef<HTMLDivElement | null>(null);
  const campaignDragStartXRef = useRef<number | null>(null);
  const campaignDragDeltaXRef = useRef(0);
  const [isCampaignDragging, setIsCampaignDragging] = useState(false);
  const [campaignDragOffset, setCampaignDragOffset] = useState(0);
  const [campaignWidth, setCampaignWidth] = useState(0);
  const [campaignTransition, setCampaignTransition] = useState<{ from: number; to: number; direction: 1 | -1 } | null>(null);
  const [draftSelectedColors, setDraftSelectedColors] = useState<string[]>([]);
  const [colorPopoverStyle, setColorPopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const colorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const colorPopoverRef = useRef<HTMLDivElement | null>(null);
  const colorPopoverFrameRef = useRef<number | null>(null);
  const [draftSelectedMaterials, setDraftSelectedMaterials] = useState<string[]>([]);
  const [materialPopoverStyle, setMaterialPopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const materialTriggerRef = useRef<HTMLButtonElement | null>(null);
  const materialPopoverRef = useRef<HTMLDivElement | null>(null);
  const materialPopoverFrameRef = useRef<number | null>(null);
  const [draftSelectedDiscounts, setDraftSelectedDiscounts] = useState<string[]>([]);
  const [discountPopoverStyle, setDiscountPopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const discountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const discountPopoverRef = useRef<HTMLDivElement | null>(null);
  const discountPopoverFrameRef = useRef<number | null>(null);
  const [draftSelectedMarcas, setDraftSelectedMarcas] = useState<string[]>([]);
  const [marcaPopoverStyle, setMarcaPopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const marcaTriggerRef = useRef<HTMLButtonElement | null>(null);
  const marcaPopoverRef = useRef<HTMLDivElement | null>(null);
  const marcaPopoverFrameRef = useRef<number | null>(null);

  const categoria = toPublicCategorySlug(effectiveParams.get("categoria") ?? "todos");
  const vista = effectiveParams.get("vista");
  const marca = effectiveParams.get("marca") ?? "todas";
  const marcaSlug = effectiveParams.get("marcaSlug") ?? "";
  const query = effectiveParams.get("buscar") ?? "";
  const campana = effectiveParams.get("campana") ?? "";
  const coleccion = effectiveParams.get("coleccion") ?? "";
  const estilo = effectiveParams.get("estilo") ?? "";
  const tipo = effectiveParams.get("tipo") ?? "";
  const linea = effectiveParams.get("linea") ?? "";
  const segmento = effectiveParams.get("segmento") ?? "";
  const color = effectiveParams.get("color") ?? "";
  const promocion = effectiveParams.get("promocion") ?? "";
  const rangoEdad = effectiveParams.get("rangoEdad") ?? "";
  const precio = effectiveParams.get("precio") ?? "";
  const talla = effectiveParams.get("talla") ?? "";
  const material = effectiveParams.get("material") ?? "";
  const descuento = effectiveParams.get("descuento") ?? "";
  const trimmedQuery = query.trim();

  const cyberShelfParams = useMemo((): Record<string, string | undefined> | null => {
    if (campana !== "cyber") return null;
    const p: Record<string, string | undefined> = { campana: "cyber" };
    if (categoria !== "todos") p.categoria = categoria;
    if (vista) p.vista = vista;
    if (marca && marca !== "todas") p.marca = marca;
    if (marcaSlug) p.marcaSlug = marcaSlug;
    if (coleccion) p.coleccion = coleccion;
    if (estilo) p.estilo = estilo;
    if (tipo) p.tipo = tipo;
    if (linea) p.linea = linea;
    if (segmento) p.segmento = segmento;
    if (color) p.color = color;
    if (promocion) p.promocion = promocion;
    if (rangoEdad) p.rangoEdad = rangoEdad;
    return p;
  }, [
    campana,
    categoria,
    vista,
    marca,
    marcaSlug,
    coleccion,
    estilo,
    tipo,
    linea,
    segmento,
    color,
    promocion,
    rangoEdad,
  ]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchPublicProducts(),
      fetchProductFamilyGroupCounts().catch(() => ({} as Record<string, number>)),
    ])
      .then(([nextProducts, counts]) => {
        if (!isMounted) return;
        setProducts(nextProducts);
        setFamilyGroupCounts(counts);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No pudimos cargar el catálogo en este momento.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (pricePopoverRef.current?.contains(event.target as Node)) return;
      if (priceTriggerRef.current?.contains(event.target as Node)) return;
      if (sizePopoverRef.current?.contains(event.target as Node)) return;
      if (sizeTriggerRef.current?.contains(event.target as Node)) return;
      if (colorPopoverRef.current?.contains(event.target as Node)) return;
      if (colorTriggerRef.current?.contains(event.target as Node)) return;
      if (materialPopoverRef.current?.contains(event.target as Node)) return;
      if (materialTriggerRef.current?.contains(event.target as Node)) return;
      if (discountPopoverRef.current?.contains(event.target as Node)) return;
      if (discountTriggerRef.current?.contains(event.target as Node)) return;
      if (marcaPopoverRef.current?.contains(event.target as Node)) return;
      if (marcaTriggerRef.current?.contains(event.target as Node)) return;
      if (filterRailRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
        return;
      }
      setActiveMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (activeMenu !== "precio" || !priceTriggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!priceTriggerRef.current) return;
      if (pricePopoverFrameRef.current) {
        window.cancelAnimationFrame(pricePopoverFrameRef.current);
      }

      pricePopoverFrameRef.current = window.requestAnimationFrame(() => {
        if (!priceTriggerRef.current) return;

        const rect = priceTriggerRef.current.getBoundingClientRect();
        const desiredWidth = Math.min(340, window.innerWidth - 32);
        const margin = 16;
        const topBelow = rect.bottom + 10;
        const maxLeft = Math.max(margin, window.innerWidth - desiredWidth - margin);
        const left = Math.max(margin, Math.min(rect.left, maxLeft));
        const top = topBelow;

        setPricePopoverStyle({
          top,
          left,
          width: desiredWidth,
        });
      });
    };

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (pricePopoverFrameRef.current) {
        window.cancelAnimationFrame(pricePopoverFrameRef.current);
        pricePopoverFrameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "talla" || !sizeTriggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!sizeTriggerRef.current) return;
      if (sizePopoverFrameRef.current) {
        window.cancelAnimationFrame(sizePopoverFrameRef.current);
      }

      sizePopoverFrameRef.current = window.requestAnimationFrame(() => {
        if (!sizeTriggerRef.current) return;

        const rect = sizeTriggerRef.current.getBoundingClientRect();
        const desiredWidth = Math.min(340, window.innerWidth - 32);
        const margin = 16;
        const topBelow = rect.bottom + 10;
        const maxLeft = Math.max(margin, window.innerWidth - desiredWidth - margin);
        const left = Math.max(margin, Math.min(rect.left, maxLeft));
        const top = topBelow;

        setSizePopoverStyle({
          top,
          left,
          width: desiredWidth,
        });
      });
    };

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (sizePopoverFrameRef.current) {
        window.cancelAnimationFrame(sizePopoverFrameRef.current);
        sizePopoverFrameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "color" || !colorTriggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!colorTriggerRef.current) return;
      if (colorPopoverFrameRef.current) {
        window.cancelAnimationFrame(colorPopoverFrameRef.current);
      }

      colorPopoverFrameRef.current = window.requestAnimationFrame(() => {
        if (!colorTriggerRef.current) return;

        const rect = colorTriggerRef.current.getBoundingClientRect();
        const desiredWidth = Math.min(600, window.innerWidth - 32);
        const margin = 16;
        const topBelow = rect.bottom + 10;
        const maxLeft = Math.max(margin, window.innerWidth - desiredWidth - margin);
        const left = Math.max(margin, Math.min(rect.left - desiredWidth / 2 + rect.width / 2, maxLeft));
        const top = topBelow;

        setColorPopoverStyle({
          top,
          left,
          width: desiredWidth,
        });
      });
    };

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (colorPopoverFrameRef.current) {
        window.cancelAnimationFrame(colorPopoverFrameRef.current);
        colorPopoverFrameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "material" || !materialTriggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!materialTriggerRef.current) return;
      if (materialPopoverFrameRef.current) {
        window.cancelAnimationFrame(materialPopoverFrameRef.current);
      }

      materialPopoverFrameRef.current = window.requestAnimationFrame(() => {
        if (!materialTriggerRef.current) return;

        const rect = materialTriggerRef.current.getBoundingClientRect();
        const desiredWidth = Math.min(420, window.innerWidth - 32);
        const margin = 16;
        const topBelow = rect.bottom + 10;
        const maxLeft = Math.max(margin, window.innerWidth - desiredWidth - margin);
        const left = Math.max(margin, Math.min(rect.left - desiredWidth / 2 + rect.width / 2, maxLeft));
        const top = topBelow;

        setMaterialPopoverStyle({
          top,
          left,
          width: desiredWidth,
        });
      });
    };

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (materialPopoverFrameRef.current) {
        window.cancelAnimationFrame(materialPopoverFrameRef.current);
        materialPopoverFrameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "descuento" || !discountTriggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!discountTriggerRef.current) return;
      if (discountPopoverFrameRef.current) {
        window.cancelAnimationFrame(discountPopoverFrameRef.current);
      }

      discountPopoverFrameRef.current = window.requestAnimationFrame(() => {
        if (!discountTriggerRef.current) return;

        const rect = discountTriggerRef.current.getBoundingClientRect();
        const desiredWidth = Math.min(360, window.innerWidth - 32);
        const margin = 16;
        const topBelow = rect.bottom + 10;
        const maxLeft = Math.max(margin, window.innerWidth - desiredWidth - margin);
        const left = Math.max(margin, Math.min(rect.left, maxLeft));
        const top = topBelow;

        setDiscountPopoverStyle({
          top,
          left,
          width: desiredWidth,
        });
      });
    };

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (discountPopoverFrameRef.current) {
        window.cancelAnimationFrame(discountPopoverFrameRef.current);
        discountPopoverFrameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "marcaSlug" || !marcaTriggerRef.current) return undefined;
    const syncPopoverPosition = () => {
      if (!marcaTriggerRef.current) return;
      if (marcaPopoverFrameRef.current) window.cancelAnimationFrame(marcaPopoverFrameRef.current);
      marcaPopoverFrameRef.current = window.requestAnimationFrame(() => {
        if (!marcaTriggerRef.current) return;
        const rect = marcaTriggerRef.current.getBoundingClientRect();
        const desiredWidth = Math.min(260, window.innerWidth - 32);
        const margin = 16;
        const estimatedHeight = 172;
        const maxLeft = Math.max(margin, window.innerWidth - desiredWidth - margin);
        const left = Math.max(margin, Math.min(rect.left, maxLeft));
        const topBelow = rect.bottom + 10;
        const topAbove = rect.top - estimatedHeight - 10;
        const top = topBelow + estimatedHeight <= window.innerHeight - margin
          ? topBelow
          : Math.max(margin, topAbove);
        setMarcaPopoverStyle({ top, left, width: desiredWidth });
      });
    };
    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (marcaPopoverFrameRef.current) {
        window.cancelAnimationFrame(marcaPopoverFrameRef.current);
        marcaPopoverFrameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [activeMenu]);

  const routeFiltered = useMemo(
    () =>
      buildRouteFilteredCatalogProducts({
        products,
        categoria,
        vista,
        marca,
        marcaSlug,
        campana,
        promocion,
        coleccion,
        tipo,
        linea,
        estilo,
        segmento,
        rangoEdad,
        color,
        trimmedQuery,
      }),
    [
      products,
      categoria,
      vista,
      marca,
      marcaSlug,
      campana,
      promocion,
      coleccion,
      tipo,
      linea,
      estilo,
      segmento,
      rangoEdad,
      color,
      trimmedQuery,
    ]
  );

  const marcas = useMemo(() => {
    const names = routeFiltered
      .map((product) => product.marca?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(names))
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ label: value, value: slugifyCatalogValue(value) }));
  }, [routeFiltered]);

  const availableColors = useMemo(() => {
    return COLOR_SWATCH_ORDER.map((value) => ({
      label: humanizeSlug(value),
      value,
      swatch: COLOR_SWATCH_MAP[value],
    }));
  }, []);

  const availableSizes = useMemo(() => {
    const numericSizes = routeFiltered
      .flatMap((product) => getProductSizes(product))
      .map((size) => Number(size))
      .filter(Number.isFinite);
    return Array.from(new Set(numericSizes))
      .sort((left, right) => left - right)
      .map((size) => String(size));
  }, [routeFiltered]);

  const availableMaterials = useMemo(() => {
    return MATERIAL_FILTER_ORDER
      .map((slug) => ({
        value: slug,
        label: MATERIAL_RULES.find((rule) => rule.slug === slug)?.label ?? humanizeSlug(slug),
      }));
  }, []);

  const priceBounds = useMemo(() => {
    if (routeFiltered.length === 0) {
      return { min: 0, max: 0, low: 0, high: 0 };
    }

    const prices = routeFiltered.map((product) => product.precio).filter(Number.isFinite);
    if (prices.length === 0) {
      return { min: 0, max: 0, low: 0, high: 0 };
    }

    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    const low = Math.max(min, Math.round((min + (max - min) * 0.35) / 10) * 10);
    const high = Math.max(low + 10, Math.round((min + (max - min) * 0.68) / 10) * 10);

    return { min, max, low, high: Math.min(high, max) };
  }, [routeFiltered]);

  const filtered = useMemo(
    () =>
      buildFacetFilteredCatalogProducts(routeFiltered, {
        precio,
        talla,
        color,
        material,
        descuento,
      }),
    [color, descuento, material, precio, routeFiltered, talla]
  );

  const pageTitle = useMemo(
    () =>
      resolveProductsPageTitle({
        vista,
        campana,
        promocion,
        coleccion,
        linea,
        tipo,
        estilo,
        segmento,
        marcaSlug,
        categoria,
        trimmedQuery,
      }),
    [campana, categoria, coleccion, estilo, linea, marcaSlug, promocion, segmento, tipo, trimmedQuery, vista]
  );

  const pageSubtitle = useMemo(() => {
    const visibleCount = `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`;

    if (campana || promocion || coleccion) {
      return `${visibleCount} visibles dentro de la selección activa. Explora por filtros rápidos sin perder la línea visual de la colección.`;
    }

    if (categoria !== "todos") {
      return `${visibleCount} listos para explorar dentro de ${categoryLabel(categoria).toLowerCase()}. Usa los menús horizontales para afinar color, talla, material o promociones.`;
    }

    return `${visibleCount} listos para comparar con una navegación más limpia, directa y coherente con la marca.`;
  }, [campana, categoria, coleccion, filtered.length, promocion]);

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
    []
  );

  const primaryFilters = useMemo<CatalogFilterGroup>(
    () => ({
      title: "Sección",
      items: [
        { label: "Todos", params: {} },
        { label: "Mujer", params: { categoria: "mujer" } },
        { label: "Hombre", params: { categoria: "hombre" } },
        { label: "Infantil", params: { categoria: "nino" } },
        { label: "Marcas", params: { vista: "marcas" } },
      ],
    }),
    []
  );

  const contextualFilters = useMemo(
    () =>
      buildContextualCatalogFilters({
        vista,
        campana,
        categoria,
        coleccion,
        tipo,
        linea,
        segmento,
        color,
        descuento,
        rangoEdad,
        marcas,
      }),
    [campana, categoria, coleccion, color, descuento, linea, marcas, rangoEdad, segmento, tipo, vista]
  );

  const showContextualFilterGroup = useMemo(() => {
    if (contextualFilters.title === "Categoría") return false;
    if (contextualFilters.items.length !== primaryFilters.items.length) return true;

    return contextualFilters.items.some((item, index) => {
      const primaryItem = primaryFilters.items[index];
      if (!primaryItem) return true;
      if (item.label !== primaryItem.label) return true;

      return CATALOG_ROUTE_PARAM_KEYS.some(
        (key) => (item.params[key] ?? "") !== (primaryItem.params[key] ?? "")
      );
    });
  }, [contextualFilters, primaryFilters]);

  const isQuickFilterActive = (params: Record<string, string | undefined>) => {
    const routeOk = CATALOG_ROUTE_PARAM_KEYS.every(
      (key) => (effectiveParams.get(key) ?? "") === (params[key] ?? "")
    );
    if (!Object.prototype.hasOwnProperty.call(params, "descuento")) return routeOk;
    return routeOk && (effectiveParams.get("descuento") ?? "") === (params.descuento ?? "");
  };

  const applySectionFilter = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams();

      Object.entries(next).forEach(([key, value]) => {
        if (!value) return;
        params.set(key, value);
      });

      setActiveMenu(null);
      const { pathname, search } = buildCanonicalCatalogLocation(params);
      navigate(`${pathname}${search}`);
    },
    [navigate]
  );

  const applyFacetFilter = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(effectiveParams);

      Object.entries(next).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      setActiveMenu(null);
      const { pathname, search } = buildCanonicalCatalogLocation(params);
      navigate(`${pathname}${search}`);
    },
    [effectiveParams, navigate]
  );

  const toggleMenu = useCallback((menuKey: string) => {
    setActiveMenu((current) => {
      if (current === menuKey) return null;
      if (menuKey === "precio") {
        setPricePopoverStyle(null);
        const nextRange = parsePriceRange(precio, priceBounds.min, priceBounds.max);
        setDraftPriceMin(nextRange.min);
        setDraftPriceMax(nextRange.max);
      }
      if (menuKey === "talla") {
        setSizePopoverStyle(null);
        setDraftSelectedSizes(filterParsedSizesForCatalogDraft(parseSizeSelection(talla), availableSizes));
      }
      if (menuKey === "color") {
        setColorPopoverStyle(null);
        setDraftSelectedColors(filterParsedColorsForCatalogDraft(parseColorSelection(color), availableColors));
      }
      if (menuKey === "material") {
        setMaterialPopoverStyle(null);
        setDraftSelectedMaterials(filterParsedMaterialsForCatalogDraft(parseMaterialSelection(material), availableMaterials));
      }
      if (menuKey === "descuento") {
        setDiscountPopoverStyle(null);
        setDraftSelectedDiscounts(parseDiscountSelection(descuento));
      }
      return menuKey;
    });
  }, [availableColors, availableMaterials, availableSizes, color, descuento, material, precio, priceBounds.max, priceBounds.min, talla]);

  const breadcrumbs = useMemo(
    () =>
      buildCatalogBreadcrumbs({
        vista,
        categoria,
        campana,
        coleccion,
        linea,
        tipo,
        estilo,
        segmento,
        rangoEdad,
        color,
        marca,
        marcaSlug,
        descuento,
        precio,
        talla,
        material,
      }),
    [campana, categoria, coleccion, color, descuento, estilo, linea, marca, marcaSlug, material, precio, rangoEdad, segmento, talla, tipo, vista]
  );

  const sectionLabel = useMemo(() => {
    if (vista === "marcas") return "Marcas";
    if (categoria !== "todos") return categoryLabel(categoria);
    return "Todo el catálogo";
  }, [categoria, vista]);

  const visibleBrandCount = useMemo(() => {
    return new Set(filtered.map((product) => product.marca).filter(Boolean)).size;
  }, [filtered]);

  const filterMenus = useMemo<FilterMenuConfig[]>(() => {
    return [
      {
        key: "precio",
        label: "Precio",
        value: precio ? getPriceLabel(precio, priceBounds.min, priceBounds.max) : "",
        options: [],
        onSelect: (value) => applyFacetFilter({ precio: value || undefined }),
      },
      {
        key: "talla",
        label: "Talla",
        value: talla ? parseSizeSelection(talla).join(", ") : "",
        options: [],
        onSelect: (value) => applyFacetFilter({ talla: value || undefined }),
      },
      {
        key: "marcaSlug",
        label: "Marca",
        value: marcaSlug ? humanizeSlug(marcaSlug) : "",
        options: marcas,
        onSelect: (value) => applyFacetFilter({ vista: value ? "marcas" : vista || undefined, marcaSlug: value || undefined }),
      },
      {
        key: "color",
        label: "Color",
        value: color ? parseColorSelection(color).map(humanizeSlug).join(", ") : "",
        options: [],
        onSelect: (value) => applyFacetFilter({ color: value || undefined }),
      },
      {
        key: "material",
        label: "Material",
        value: material ? parseMaterialSelection(material).map(humanizeSlug).join(", ") : "",
        options: [],
        onSelect: (value) => applyFacetFilter({ material: value || undefined }),
      },
      {
        key: "descuento",
        label: "Descuento %",
        value: descuento ? parseDiscountSelection(descuento).map((value) => DISCOUNT_OPTIONS.find((option) => option.value === value)?.label ?? value).join(", ") : "",
        options: [],
        onSelect: (value) => applyFacetFilter({ descuento: value || undefined }),
      },
    ];
  }, [
    applyFacetFilter,
    color,
    descuento,
    marcas,
    marcaSlug,
    material,
    precio,
    priceBounds.max,
    priceBounds.min,
    talla,
    vista,
  ]);

  const activeFacets = useMemo(
    () =>
      buildActiveCatalogFacetChips(
        {
          precio,
          talla,
          marcaSlug,
          color,
          material,
          descuento,
          categoria,
          vista,
          priceBoundsMin: priceBounds.min,
          priceBoundsMax: priceBounds.max,
        },
        applyFacetFilter
      ),
    [applyFacetFilter, categoria, color, descuento, marcaSlug, material, precio, priceBounds.max, priceBounds.min, talla, vista]
  );

  const hasAnyProducts = filtered.length > 0;

  useEffect(() => {
    const track = campaignTrackRef.current;
    if (!track) return undefined;

    const updateCampaignWidth = () => {
      setCampaignWidth(track.getBoundingClientRect().width);
    };
    updateCampaignWidth();

    const observer = new ResizeObserver(updateCampaignWidth);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const moveCampaignBy = useCallback((direction: 1 | -1) => {
    const slideCount = catalogCampaignSlides.length;
    if (slideCount < 2 || campaignTransition) return;

    const from = activeCampaignSlide;
    const to = (activeCampaignSlide + direction + slideCount) % slideCount;
    setActiveCampaignSlide(to);
    setCampaignTransition({ from, to, direction });
  }, [activeCampaignSlide, campaignTransition, catalogCampaignSlides.length]);

  const handleCampaignPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const track = campaignTrackRef.current;
    if (!track || catalogCampaignSlides.length < 2 || campaignTransition) return;
    campaignDragStartXRef.current = event.clientX;
    campaignDragDeltaXRef.current = 0;
    setCampaignWidth(track.getBoundingClientRect().width);
    setIsCampaignDragging(true);
    try {
      track.setPointerCapture?.(event.pointerId);
    } catch {
      // Playwright synthetic touch events do not always create an active pointer.
    }
  }, [campaignTransition, catalogCampaignSlides.length]);

  const handleCampaignPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const startX = campaignDragStartXRef.current;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    campaignDragDeltaXRef.current = deltaX;
    setCampaignDragOffset(deltaX);
    event.preventDefault();
  }, []);

  const endCampaignDrag = useCallback((pointerId?: number) => {
    const track = campaignTrackRef.current;
    const startX = campaignDragStartXRef.current;
    campaignDragStartXRef.current = null;
    setIsCampaignDragging(false);
    setCampaignDragOffset(0);
    if (!track || startX === null) return;

    if (typeof pointerId === "number" && track.hasPointerCapture?.(pointerId)) {
      track.releasePointerCapture(pointerId);
    }

    const dragDeltaX = campaignDragDeltaXRef.current;
    if (Math.abs(dragDeltaX) > 44) {
      moveCampaignBy(dragDeltaX < 0 ? 1 : -1);
    }
  }, [moveCampaignBy]);

  const handleCampaignPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    endCampaignDrag(event.pointerId);
  }, [endCampaignDrag]);

  const handleCampaignPointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    endCampaignDrag(event.pointerId);
  }, [endCampaignDrag]);

  const advanceCampaignSlide = useCallback(() => {
    if (catalogCampaignSlides.length < 2) return;
    moveCampaignBy(1);
  }, [catalogCampaignSlides.length, moveCampaignBy]);

  useEffect(() => {
    if (catalogCampaignSlides.length < 2 || isCampaignDragging || campaignTransition) return undefined;
    const timer = window.setTimeout(() => {
      advanceCampaignSlide();
    }, CATALOG_CAMPAIGN_ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeCampaignSlide, advanceCampaignSlide, campaignTransition, catalogCampaignSlides.length, isCampaignDragging]);

  const handleCampaignAnimationEnd = useCallback((index: number) => {
    if (campaignTransition?.to === index) {
      setCampaignTransition(null);
    }
  }, [campaignTransition]);

  const campaignDragDirection = campaignDragOffset < 0 ? 1 : campaignDragOffset > 0 ? -1 : 0;
  const campaignDragTarget = campaignDragDirection === 0
    ? null
    : (activeCampaignSlide + campaignDragDirection + catalogCampaignSlides.length) % catalogCampaignSlides.length;

  const getCampaignSlideClassName = useCallback((index: number) => {
    let className = "catalog-campaign-slide";
    if (campaignTransition) {
      if (index === campaignTransition.from) {
        className += ` is-active is-exiting ${campaignTransition.direction === 1 ? "to-left" : "to-right"}`;
      }
      if (index === campaignTransition.to) {
        className += ` is-active is-entering ${campaignTransition.direction === 1 ? "from-right" : "from-left"}`;
      }
      return className;
    }

    if (index === activeCampaignSlide) className += " is-active";
    if (isCampaignDragging && campaignDragTarget === index) className += " is-drag-target";
    return className;
  }, [activeCampaignSlide, campaignDragTarget, campaignTransition, isCampaignDragging]);

  const getCampaignSlideStyle = useCallback((index: number) => {
    if (!isCampaignDragging || campaignDragDirection === 0 || campaignWidth <= 0) return undefined;

    if (index === activeCampaignSlide) {
      return { transform: `translate3d(${campaignDragOffset}px, 0, 0)`, opacity: 1, zIndex: 2 } as CSSProperties;
    }

    if (index === campaignDragTarget) {
      const origin = campaignDragDirection === 1 ? campaignWidth : -campaignWidth;
      return { transform: `translate3d(${origin + campaignDragOffset}px, 0, 0)`, opacity: 1, zIndex: 1 } as CSSProperties;
    }

    return undefined;
  }, [activeCampaignSlide, campaignDragDirection, campaignDragOffset, campaignDragTarget, campaignWidth, isCampaignDragging]);

  const fillRangeLeft = (() => {
    if (priceBounds.max <= priceBounds.min) return "10px";
    const l = (draftPriceMin - priceBounds.min) / (priceBounds.max - priceBounds.min);
    return `calc(${(l * 100).toFixed(2)}% + ${(10 - l * 20).toFixed(2)}px)`;
  })();
  const fillRangeRight = (() => {
    if (priceBounds.max <= priceBounds.min) return "10px";
    const r = (draftPriceMax - priceBounds.min) / (priceBounds.max - priceBounds.min);
    return `calc(${((1 - r) * 100).toFixed(2)}% + ${(r * 20 - 10).toFixed(2)}px)`;
  })();
  return (
    <main className="products-page products-page-modern">
      <section
        className="catalog-campaign-shell"
        aria-label={pageTitle}
        aria-description={`${pageSubtitle} ${sectionLabel}. ${visibleBrandCount || 0} marcas visibles.`}
      >
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

        <div
          className="catalog-campaign-progress"
          role="progressbar"
          aria-label="Progreso de campañas"
          aria-valuemin={1}
          aria-valuemax={catalogCampaignSlides.length}
          aria-valuenow={activeCampaignSlide + 1}
          aria-valuetext={`${activeCampaignSlide + 1} de ${catalogCampaignSlides.length}`}
        >
          <span className="catalog-campaign-progress-track">
            <span key={`campaign-progress-${activeCampaignSlide}`} className="catalog-campaign-progress-fill" />
          </span>
        </div>
      </section>

      {breadcrumbs.length > 1 && (
        <nav className="catalog-breadcrumbs" aria-label="Navegación del catálogo">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={`${crumb.label}-${index}`} className="catalog-breadcrumb-item">
                <button
                  type="button"
                  className={`catalog-breadcrumb-btn ${isLast ? "is-current" : ""}`}
                  onClick={() => applySectionFilter(crumb.params)}
                  disabled={isLast}
                >
                  {crumb.label}
                </button>
                {!isLast && <ChevronRight size={14} className="catalog-breadcrumb-separator" />}
              </div>
            );
          })}
        </nav>
      )}

      <section className="catalog-control-shell">
        <div className="catalog-section-tabs" aria-label={primaryFilters.title}>
          {primaryFilters.items.map((item) => (
            <button
              key={`section-${item.label}`}
              type="button"
              className={`catalog-section-tab ${isQuickFilterActive(item.params) ? "is-active" : ""}`}
              onClick={() => applySectionFilter(item.params)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {showContextualFilterGroup && (
          <div className="catalog-context-strip">
            <span className="catalog-context-label">{contextualFilters.title}</span>
            <div className="catalog-context-pills">
              {contextualFilters.items.map((item) => (
                <button
                  key={`context-${contextualFilters.title}-${item.label}`}
                  type="button"
                  className={`catalog-context-pill ${isQuickFilterActive(item.params) ? "is-active" : ""}`}
                  onClick={() => applySectionFilter(item.params)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {campana === "cyber" && cyberShelfParams && (
          <div
            className="catalog-context-strip catalog-context-strip--cyber-descuentos"
            aria-label="Descuentos Cyber Wow"
          >
            <span className="catalog-context-label">Descuento Cyber Wow</span>
            <div className="catalog-context-pills">
              {CYBER_DISCOUNT_PILL_OPTIONS.map((opt) => {
                const params = { ...cyberShelfParams, descuento: opt.value };
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`catalog-context-pill ${isQuickFilterActive(params) ? "is-active" : ""}`}
                    onClick={() => applySectionFilter(params)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <CatalogFilterRail
          filterRailRef={filterRailRef}
          menus={filterMenus.map((menu) => ({ key: menu.key, label: menu.label, value: menu.value }))}
          activeMenu={activeMenu}
          toggleMenu={toggleMenu}
          triggerRefs={{
            priceTriggerRef,
            sizeTriggerRef,
            marcaTriggerRef,
            colorTriggerRef,
            materialTriggerRef,
            discountTriggerRef,
          }}
        />

        {activeMenu === "precio" && pricePopoverStyle && (
          <div
            id="catalog-price-popover"
            ref={pricePopoverRef}
            className="catalog-price-popover"
            role="dialog"
            aria-label="Filtro de precio"
            style={{
              top: `${pricePopoverStyle.top}px`,
              left: `${pricePopoverStyle.left}px`,
              width: `${pricePopoverStyle.width}px`,
            }}
          >
            <div className="catalog-filter-menu catalog-filter-menu-price">
              <div className="catalog-price-fields">
                <label className="catalog-price-field">
                  <div className="catalog-price-input-shell">
                    <span className="catalog-price-input-label">Mínimo</span>
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={draftPriceMax}
                      value={draftPriceMin}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next)) return;
                        setDraftPriceMin(Math.max(priceBounds.min, Math.min(next, draftPriceMax)));
                      }}
                    />
                    <em>S/.</em>
                  </div>
                </label>

                <label className="catalog-price-field">
                  <div className="catalog-price-input-shell">
                    <span className="catalog-price-input-label">Máximo</span>
                    <input
                      type="number"
                      min={draftPriceMin}
                      max={priceBounds.max}
                      value={draftPriceMax}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next)) return;
                        setDraftPriceMax(Math.min(priceBounds.max, Math.max(next, draftPriceMin)));
                      }}
                    />
                    <em>S/.</em>
                  </div>
                </label>
              </div>

              <div className="catalog-price-slider-shell">
                <div className="catalog-price-slider-track" />
                <div
                  className="catalog-price-slider-range"
                  style={{ left: fillRangeLeft, right: fillRangeRight }}
                />
                <input
                  className="catalog-price-slider catalog-price-slider-min"
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={1}
                  value={draftPriceMin}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setDraftPriceMin(Math.min(next, draftPriceMax));
                  }}
                />
                <input
                  className="catalog-price-slider catalog-price-slider-max"
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={1}
                  value={draftPriceMax}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setDraftPriceMax(Math.max(next, draftPriceMin));
                  }}
                />
              </div>

              <button
                type="button"
                className="catalog-price-apply"
                onClick={() => {
                  const priceMenu = filterMenus.find((menu) => menu.key === "precio");
                  priceMenu?.onSelect(`range:${draftPriceMin}:${draftPriceMax}`);
                }}
              >
                Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {activeMenu === "talla" && sizePopoverStyle && (
          <div
            id="catalog-size-popover"
            ref={sizePopoverRef}
            className="catalog-price-popover"
            role="dialog"
            aria-label="Filtro de talla"
            style={{
              top: `${sizePopoverStyle.top}px`,
              left: `${sizePopoverStyle.left}px`,
              width: `${sizePopoverStyle.width}px`,
            }}
          >
            <div className="catalog-filter-menu catalog-filter-menu-price">
              <div className="catalog-size-grid" role="group" aria-label="Tallas disponibles">
                {availableSizes.length === 0 ? (
                  <p className="catalog-size-empty">No hay tallas disponibles para los filtros actuales.</p>
                ) : (
                  availableSizes.map((size) => {
                    const checked = draftSelectedSizes.includes(size);
                    return (
                      <label key={size} className="catalog-size-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setDraftSelectedSizes((current) =>
                              toggleCatalogStringListMember(current, size, checked)
                            );
                          }}
                        />
                        <span>{size}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                className="catalog-price-apply"
                onClick={() => {
                  const tallaMenu = filterMenus.find((m) => m.key === "talla");
                  tallaMenu?.onSelect(draftSelectedSizes.join(","));
                }}
              >
                Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {activeMenu === "color" && colorPopoverStyle && (
          <div
            id="catalog-color-popover"
            ref={colorPopoverRef}
            className="catalog-price-popover"
            role="dialog"
            aria-label="Filtro de color"
            style={{
              top: `${colorPopoverStyle.top}px`,
              left: `${colorPopoverStyle.left}px`,
              width: `${colorPopoverStyle.width}px`,
            }}
          >
            <div className="catalog-filter-menu catalog-filter-menu-price">
              <div className="catalog-color-grid" role="group" aria-label="Colores disponibles">
                {availableColors.length === 0 ? (
                  <p className="catalog-size-empty">No hay colores disponibles para los filtros actuales.</p>
                ) : (
                  availableColors.map((colorOption) => {
                    const checked = draftSelectedColors.includes(colorOption.value);
                    return (
                      <button
                        key={colorOption.value}
                        type="button"
                        className={`catalog-color-item ${checked ? "is-active" : ""}`}
                        onClick={() =>
                          setDraftSelectedColors((current) =>
                            toggleCatalogStringListMember(current, colorOption.value, checked)
                          )
                        }
                      >
                        <span
                          className="catalog-color-swatch"
                          style={{ background: colorOption.swatch }}
                          aria-hidden="true"
                        />
                        <span>{colorOption.label}</span>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                className="catalog-price-apply"
                onClick={() => {
                  const colorMenu = filterMenus.find((m) => m.key === "color");
                  colorMenu?.onSelect(draftSelectedColors.join(","));
                }}
              >
                Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {activeMenu === "material" && materialPopoverStyle && (
          <div
            id="catalog-material-popover"
            ref={materialPopoverRef}
            className="catalog-price-popover"
            role="dialog"
            aria-label="Filtro de material"
            style={{
              top: `${materialPopoverStyle.top}px`,
              left: `${materialPopoverStyle.left}px`,
              width: `${materialPopoverStyle.width}px`,
            }}
          >
            <div className="catalog-filter-menu catalog-filter-menu-price catalog-filter-menu-material">
              <div className="catalog-material-grid" role="group" aria-label="Materiales disponibles">
                {availableMaterials.length === 0 ? (
                  <p className="catalog-size-empty">No hay materiales disponibles para los filtros actuales.</p>
                ) : (
                  availableMaterials.map((materialOption) => {
                    const checked = draftSelectedMaterials.includes(materialOption.value);
                    return (
                      <label key={materialOption.value} className="catalog-material-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setDraftSelectedMaterials((current) =>
                              toggleCatalogStringListMember(current, materialOption.value, checked)
                            );
                          }}
                        />
                        <span>{materialOption.label}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                className="catalog-price-apply"
                onClick={() => {
                  const materialMenu = filterMenus.find((m) => m.key === "material");
                  materialMenu?.onSelect(draftSelectedMaterials.join(","));
                }}
              >
                Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {activeMenu === "descuento" && discountPopoverStyle && (
          <div
            id="catalog-discount-popover"
            ref={discountPopoverRef}
            className="catalog-price-popover"
            role="dialog"
            aria-label="Filtro de descuento"
            style={{
              top: `${discountPopoverStyle.top}px`,
              left: `${discountPopoverStyle.left}px`,
              width: `${discountPopoverStyle.width}px`,
            }}
          >
            <div className="catalog-filter-menu catalog-filter-menu-price">
              <div className="catalog-checklist-vertical" role="group" aria-label="Descuentos disponibles">
                {DISCOUNT_OPTIONS.map((discountOption) => {
                  const checked = draftSelectedDiscounts.includes(discountOption.value);
                  return (
                    <label key={discountOption.value} className="catalog-size-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setDraftSelectedDiscounts((current) =>
                            toggleCatalogStringListMember(current, discountOption.value, checked)
                          );
                        }}
                      />
                      <span>{discountOption.label}</span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                className="catalog-price-apply"
                onClick={() => {
                  const discountMenu = filterMenus.find((m) => m.key === "descuento");
                  discountMenu?.onSelect(draftSelectedDiscounts.join(","));
                }}
              >
                Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {activeMenu === "marcaSlug" && marcaPopoverStyle && (
          <div
            id="catalog-marca-popover"
            ref={marcaPopoverRef}
            className="catalog-price-popover"
            role="dialog"
            aria-label="Filtro de marca"
            style={{
              top: `${marcaPopoverStyle.top}px`,
              left: `${marcaPopoverStyle.left}px`,
              width: `${marcaPopoverStyle.width}px`,
            }}
          >
            <div className="catalog-filter-menu catalog-filter-menu-price">
              <div className="catalog-checklist-vertical" role="group" aria-label="Marcas disponibles">
                {marcas.length === 0 ? (
                  <p className="catalog-size-empty">No hay marcas disponibles.</p>
                ) : (
                  marcas.map((brandOption) => {
                    const selected = draftSelectedMarcas[0] === brandOption.value;
                    return (
                      <label key={brandOption.value} className="catalog-size-item">
                        <input
                          type="radio"
                          name="catalog-marca-radio"
                          checked={selected}
                          onChange={() => {
                            setDraftSelectedMarcas(selected ? [] : [brandOption.value]);
                          }}
                        />
                        <span>{brandOption.label}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                className="catalog-price-apply"
                onClick={() => {
                  const marcaMenu = filterMenus.find((m) => m.key === "marcaSlug");
                  marcaMenu?.onSelect(draftSelectedMarcas[0] ?? "");
                }}
              >
                Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {activeFacets.length > 0 && (
          <div className="catalog-active-facets" aria-label="Filtros activos">
            {activeFacets.map((facet) => (
              <button key={facet.label} type="button" className="catalog-active-facet" onClick={facet.onClear}>
                <span>{facet.label}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="products-main">
        {loading ? (
          <div className="products-grid">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="skeleton-card" />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state" role="status" aria-live="polite">
            <AlertTriangle size={28} />
            <p>{error} Revisa tu conexión y vuelve a intentarlo.</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setReloadToken((current) => current + 1);
              }}
              className="btn-primary"
            >
              Reintentar
            </button>
          </div>
        ) : !hasAnyProducts ? (
          <div className="empty-state">
            <p>
              {trimmedQuery
                ? `No encontramos resultados para "${trimmedQuery}" con los filtros actuales.`
                : "No encontramos productos con la combinación actual de filtros."}
            </p>
            <button type="button" onClick={() => navigate(CATALOG_SHELF.products)} className="btn-primary">
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                familyGroupSize={familyGroupCounts[effectiveFamiliaKey(product)] ?? 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

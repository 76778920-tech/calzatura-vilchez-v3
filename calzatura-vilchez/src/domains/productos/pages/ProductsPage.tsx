import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { fetchProducts } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import ProductCard from "@/domains/productos/components/ProductCard";
import {
  productMatchesBrandSlug,
  productMatchesCategory,
  productMatchesSearch,
  productMatchesTaxonomy,
  slugifyCatalogValue,
  toPublicCategorySlug,
} from "@/utils/catalog";
import { categoryLabel } from "@/utils/labels";

const CATEGORIAS = ["todos", "hombre", "mujer", "juvenil", "nino", "bebe"];

type CatalogQuickFilter = {
  label: string;
  params: Record<string, string | undefined>;
};

type CatalogFilterGroup = {
  title: string;
  items: CatalogQuickFilter[];
};

type CatalogBreadcrumb = {
  label: string;
  params: Record<string, string | undefined>;
};

const TAXONOMY_KEYS = [
  "categoria",
  "vista",
  "marca",
  "marcaSlug",
  "campana",
  "coleccion",
  "estilo",
  "tipo",
  "linea",
  "segmento",
  "color",
  "promocion",
  "rangoEdad",
] as const;

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [maxPrecio, setMaxPrecio] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  const categoria = toPublicCategorySlug(searchParams.get("categoria") ?? "todos");
  const vista = searchParams.get("vista");
  const marca = searchParams.get("marca") ?? "todas";
  const marcaSlug = searchParams.get("marcaSlug") ?? "";
  const query = searchParams.get("buscar") ?? "";
  const campana = searchParams.get("campana") ?? "";
  const coleccion = searchParams.get("coleccion") ?? "";
  const estilo = searchParams.get("estilo") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const linea = searchParams.get("linea") ?? "";
  const segmento = searchParams.get("segmento") ?? "";
  const color = searchParams.get("color") ?? "";
  const promocion = searchParams.get("promocion") ?? "";
  const rangoEdad = searchParams.get("rangoEdad") ?? "";
  const trimmedQuery = query.trim();

  const humanizeSlug = (value: string) =>
    value
      .split("-")
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(" ");

  useEffect(() => {
    let isMounted = true;

    fetchProducts()
      .then((nextProducts) => {
        if (!isMounted) return;
        setProducts(nextProducts);
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

  const baseFiltered = useMemo(() => {
    let result = [...products];

    if (categoria !== "todos") {
      result = result.filter((p) => productMatchesCategory(p.categoria, categoria));
    }

    if (vista === "marcas" && marca !== "todas") {
      result = result.filter((p) => p.marca?.toLowerCase() === marca.toLowerCase());
    }

    if (marcaSlug) {
      result = result.filter((p) => productMatchesBrandSlug(p, marcaSlug));
    }

    if (campana) {
      result = result.filter((p) => productMatchesTaxonomy(p, "campana", campana));
    }

    if (promocion) {
      result = result.filter((p) => productMatchesTaxonomy(p, "promocion", promocion));
    }

    if (coleccion) {
      result = result.filter((p) => productMatchesTaxonomy(p, "coleccion", coleccion));
    }

    if (tipo) {
      result = result.filter((p) => productMatchesTaxonomy(p, "tipo", tipo));
    }

    if (linea) {
      result = result.filter((p) => productMatchesTaxonomy(p, "linea", linea));
    }

    if (estilo) {
      result = result.filter((p) => productMatchesTaxonomy(p, "estilo", estilo));
    }

    if (segmento) {
      result = result.filter((p) => productMatchesTaxonomy(p, "segmento", segmento));
    }

    if (rangoEdad) {
      result = result.filter((p) => productMatchesTaxonomy(p, "rangoEdad", rangoEdad));
    }

    if (color) {
      result = result.filter((p) => productMatchesTaxonomy(p, "color", color));
    }

    if (query.trim()) {
      result = result.filter((p) => productMatchesSearch(p, query));
    }

    return result;
  }, [
    products,
    categoria,
    query,
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
  ]);

  const marcas = useMemo(() => {
    const names = products
      .map((product) => product.marca?.trim())
      .filter((name): name is string => Boolean(name));

    return ["todas", ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const priceBounds = useMemo(() => {
    if (baseFiltered.length === 0) {
      return { min: 0, max: 0, step: 1 };
    }

    const prices = baseFiltered
      .map((product) => product.precio)
      .filter((price) => Number.isFinite(price));
    if (prices.length === 0) {
      return { min: 0, max: 0, step: 1 };
    }

    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    const span = Math.max(1, max - min);

    return { min, max, step: span <= 100 ? 1 : 5 };
  }, [baseFiltered]);

  const effectiveMaxPrecio =
    priceBounds.max === 0
      ? 0
      : Math.min(
          Math.max(maxPrecio === 0 ? priceBounds.max : maxPrecio, priceBounds.min),
          priceBounds.max
        );

  const filtered = useMemo(() => {
    let result = [...baseFiltered];

    result = result.filter((p) => p.precio <= effectiveMaxPrecio);

    if (sortBy === "precio-asc") result.sort((a, b) => a.precio - b.precio);
    else if (sortBy === "precio-desc") result.sort((a, b) => b.precio - a.precio);
    else if (sortBy === "nombre") result.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return result;
  }, [baseFiltered, sortBy, effectiveMaxPrecio]);

  const isPromotionalQuery = useMemo(() => {
    const normalized = trimmedQuery.toLowerCase();
    return ["destacado", "destacados", "oferta", "ofertas", "cyber", "nuevo", "nuevos", "tendencia", "tendencias"].includes(normalized);
  }, [trimmedQuery]);

  const pageTitle = useMemo(() => {
    if (vista === "marcas") return "Marcas";
    if (campana) return `Campaña ${humanizeSlug(campana)}`;
    if (promocion) return `Selección ${humanizeSlug(promocion)}`;
    if (coleccion) return humanizeSlug(coleccion);
    if (linea) return `${humanizeSlug(linea)}${categoria !== "todos" ? ` ${categoryLabel(categoria)}` : ""}`.trim();
    if (tipo) return `${humanizeSlug(tipo)}${categoria !== "todos" ? ` ${categoryLabel(categoria)}` : ""}`.trim();
    if (estilo) return `${humanizeSlug(estilo)}${categoria !== "todos" ? ` ${categoryLabel(categoria)}` : ""}`.trim();
    if (segmento) return humanizeSlug(segmento);
    if (marcaSlug) return `Marca ${humanizeSlug(marcaSlug)}`;
    if (categoria !== "todos") return `Calzado ${categoryLabel(categoria)}`;
    if (trimmedQuery) return `Resultados para "${trimmedQuery}"`;
    return "Todos los Productos";
  }, [campana, categoria, coleccion, estilo, linea, marcaSlug, promocion, segmento, tipo, trimmedQuery, vista]);

  const pageSubtitle = useMemo(() => {
    if (isPromotionalQuery || Boolean(campana) || Boolean(promocion)) {
      return `${filtered.length} producto${filtered.length !== 1 ? "s" : ""} en la selección destacada`;
    }
    return `${filtered.length} producto${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`;
  }, [campana, filtered.length, isPromotionalQuery, promocion]);

  const resetFilters = () => {
    setMaxPrecio(0);
    setSortBy("default");
    setSearchParams(new URLSearchParams());
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("buscar", value);
    } else {
      params.delete("buscar");
    }
    setSearchParams(params);
  };

  const applyQuickFilter = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);

    TAXONOMY_KEYS.forEach((key) => params.delete(key));
    params.delete("buscar");

    Object.entries(next).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });

    setSearchParams(params);
  };

  const primaryFilters = useMemo<CatalogFilterGroup>(
    () => ({
      title: "Sección",
      items: [
        { label: "Todos", params: {} },
        { label: "Hombre", params: { categoria: "hombre" } },
        { label: "Mujer", params: { categoria: "mujer" } },
        { label: "Infantil", params: { categoria: "nino" } },
        { label: "Marcas", params: { vista: "marcas" } },
      ],
    }),
    []
  );

  const contextualFilters = useMemo<CatalogFilterGroup>(() => {
    const make = (
      label: string,
      items: CatalogQuickFilter[]
    ): CatalogFilterGroup => ({
      title: label,
      items,
    });

    if (vista === "marcas") {
      return make("Marcas", marcas.map((brand) => ({
        label: brand === "todas" ? "Todas" : brand,
        params:
          brand === "todas"
            ? { vista: "marcas" }
            : { vista: "marcas", marcaSlug: slugifyCatalogValue(brand) },
      })));
    }

    if (campana === "cyber" && linea === "zapatillas") {
      return make("Cyber Zapatillas", [
        { label: "Todos", params: { linea: "zapatillas", campana: "cyber" } },
        { label: "Mujer", params: { categoria: "mujer", tipo: "zapatillas", campana: "cyber" } },
        { label: "Hombre", params: { categoria: "hombre", tipo: "zapatillas", campana: "cyber" } },
        { label: "Niños", params: { categoria: "nino", tipo: "zapatillas", campana: "cyber" } },
      ]);
    }

    if (campana === "cyber" && categoria === "hombre") {
      return make("Cyber Hombre", [
        { label: "Todos", params: { categoria: "hombre", campana: "cyber" } },
        { label: "Zapatillas Cyber", params: { categoria: "hombre", campana: "cyber", tipo: "zapatillas" } },
        { label: "Zapatos Cyber", params: { categoria: "hombre", campana: "cyber", tipo: "zapatos" } },
        { label: "Botines Cyber", params: { categoria: "hombre", campana: "cyber", tipo: "botines" } },
      ]);
    }

    if (campana === "cyber" && categoria === "mujer") {
      return make("Cyber Mujer", [
        { label: "Todos", params: { categoria: "mujer", campana: "cyber" } },
        { label: "Zapatillas Cyber", params: { categoria: "mujer", campana: "cyber", tipo: "zapatillas" } },
        { label: "Sandalias Cyber", params: { categoria: "mujer", campana: "cyber", tipo: "sandalias" } },
        { label: "Botines Cyber", params: { categoria: "mujer", campana: "cyber", tipo: "botines" } },
      ]);
    }

    if (campana === "cyber" && categoria === "nino") {
      return make("Cyber Infantil", [
        { label: "Todos", params: { categoria: "nino", campana: "cyber" } },
        { label: "Escolar Cyber", params: { categoria: "nino", campana: "cyber", tipo: "escolar" } },
        { label: "Juvenil Activo", params: { categoria: "nino", campana: "cyber", segmento: "juvenil" } },
        { label: "Zapatillas Cyber", params: { categoria: "nino", campana: "cyber", tipo: "zapatillas" } },
      ]);
    }

    if (categoria === "mujer" && (campana === "nueva-temporada" || ["pasos-radiantes", "urban-glow", "sunset-chic"].includes(coleccion))) {
      return make("Nuevas Tendencias", [
        { label: "Nueva Temporada", params: { categoria: "mujer", campana: "nueva-temporada" } },
        { label: "Pasos Radiantes", params: { categoria: "mujer", coleccion: "pasos-radiantes" } },
        { label: "Urban Glow", params: { categoria: "mujer", coleccion: "urban-glow" } },
        { label: "Sunset Chic", params: { categoria: "mujer", coleccion: "sunset-chic" } },
      ]);
    }

    if (categoria === "hombre" && (campana === "nueva-temporada" || ["ruta-urbana", "paso-ejecutivo", "weekend-flow"].includes(coleccion))) {
      return make("Nuevas Tendencias", [
        { label: "Nueva Temporada", params: { categoria: "hombre", campana: "nueva-temporada" } },
        { label: "Ruta Urbana", params: { categoria: "hombre", coleccion: "ruta-urbana" } },
        { label: "Paso Ejecutivo", params: { categoria: "hombre", coleccion: "paso-ejecutivo" } },
        { label: "Weekend Flow", params: { categoria: "hombre", coleccion: "weekend-flow" } },
      ]);
    }

    if (categoria === "nino" && (campana === "nueva-temporada" || ["vuelta-al-cole", "mini-aventuras"].includes(coleccion))) {
      return make("Nuevas Tendencias", [
        { label: "Nueva Temporada", params: { categoria: "nino", campana: "nueva-temporada" } },
        { label: "Vuelta al Cole", params: { categoria: "nino", coleccion: "vuelta-al-cole" } },
        { label: "Paso Activo", params: { categoria: "nino", tipo: "zapatillas" } },
        { label: "Mini Aventuras", params: { categoria: "nino", coleccion: "mini-aventuras" } },
      ]);
    }

    if (categoria === "mujer" && tipo === "zapatillas") {
      return make("Zapatillas Mujer", [
        { label: "Todos", params: { categoria: "mujer", tipo: "zapatillas" } },
        { label: "Urbanas", params: { categoria: "mujer", tipo: "zapatillas", estilo: "urbanas" } },
        { label: "Deportivas", params: { categoria: "mujer", tipo: "zapatillas", estilo: "deportivas" } },
        { label: "Casuales", params: { categoria: "mujer", tipo: "zapatillas", estilo: "casuales" } },
        { label: "Outdoor", params: { categoria: "mujer", tipo: "zapatillas", estilo: "outdoor" } },
      ]);
    }

    if (categoria === "hombre" && tipo === "zapatillas") {
      return make("Zapatillas Hombre", [
        { label: "Todos", params: { categoria: "hombre", tipo: "zapatillas" } },
        { label: "Urbanas", params: { categoria: "hombre", tipo: "zapatillas", estilo: "urbanas" } },
        { label: "Deportivas", params: { categoria: "hombre", tipo: "zapatillas", estilo: "deportivas" } },
        { label: "Casuales", params: { categoria: "hombre", tipo: "zapatillas", estilo: "casuales" } },
        { label: "Outdoor", params: { categoria: "hombre", tipo: "zapatillas", estilo: "outdoor" } },
      ]);
    }

    if ((linea === "zapatillas" || tipo === "zapatillas") && color === "blanco") {
      return make("Zapatillas Blancas", [
        { label: "Todos", params: { linea: "zapatillas", color: "blanco" } },
        { label: "Mujer", params: { categoria: "mujer", tipo: "zapatillas", color: "blanco" } },
        { label: "Hombre", params: { categoria: "hombre", tipo: "zapatillas", color: "blanco" } },
        { label: "Niños", params: { categoria: "nino", tipo: "zapatillas", color: "blanco" } },
        { label: "Juvenil", params: { categoria: "nino", segmento: "juvenil", tipo: "zapatillas", color: "blanco" } },
      ]);
    }

    if (categoria === "nino" && segmento === "ninas") {
      return make("Niñas", [
        { label: "Todos", params: { categoria: "nino", segmento: "ninas" } },
        { label: "Escolar", params: { categoria: "nino", segmento: "ninas", tipo: "escolar" } },
        { label: "Zapatillas", params: { categoria: "nino", segmento: "ninas", tipo: "zapatillas" } },
        { label: "Ballerinas", params: { categoria: "nino", segmento: "ninas", tipo: "ballerinas" } },
        { label: "Botas y Botines", params: { categoria: "nino", segmento: "ninas", tipo: "botas" } },
        { label: "Sandalias", params: { categoria: "nino", segmento: "ninas", tipo: "sandalias" } },
        { label: "Zapatos", params: { categoria: "nino", segmento: "ninas", tipo: "zapatos" } },
      ]);
    }

    if (categoria === "nino" && (segmento === "ninos" || segmento === "junior" || rangoEdad)) {
      return make("Niños", [
        { label: "Todos", params: { categoria: "nino", segmento: "ninos" } },
        { label: "Infantil 1-3", params: { categoria: "nino", rangoEdad: "1-3" } },
        { label: "Niños 4-6", params: { categoria: "nino", segmento: "ninos" } },
        { label: "Junior 7-10", params: { categoria: "nino", segmento: "junior" } },
        { label: "Accesorios", params: { categoria: "nino", tipo: "accesorios" } },
        { label: "Zapatos", params: { categoria: "nino", tipo: "zapatos" } },
      ]);
    }

    if (categoria === "mujer") {
      return make("Calzado Mujer", [
        { label: "Todos", params: { categoria: "mujer" } },
        { label: "Zapatillas", params: { categoria: "mujer", tipo: "zapatillas" } },
        { label: "Sandalias", params: { categoria: "mujer", tipo: "sandalias" } },
        { label: "Casual", params: { categoria: "mujer", tipo: "casual" } },
        { label: "Vestir", params: { categoria: "mujer", tipo: "formal" } },
        { label: "Mocasines", params: { categoria: "mujer", tipo: "mocasines" } },
        { label: "Botas", params: { categoria: "mujer", tipo: "botas" } },
      ]);
    }

    if (categoria === "hombre") {
      return make("Calzado Hombre", [
        { label: "Todos", params: { categoria: "hombre" } },
        { label: "Zapatillas", params: { categoria: "hombre", tipo: "zapatillas" } },
        { label: "Vestir", params: { categoria: "hombre", tipo: "formal" } },
        { label: "Casual", params: { categoria: "hombre", tipo: "casual" } },
        { label: "Sandalias", params: { categoria: "hombre", tipo: "sandalias" } },
        { label: "Botines", params: { categoria: "hombre", tipo: "botines" } },
        { label: "Seguridad", params: { categoria: "hombre", tipo: "seguridad" } },
      ]);
    }

    if (categoria === "nino") {
      return make("Infantil", [
        { label: "Todos", params: { categoria: "nino" } },
        { label: "Escolar", params: { categoria: "nino", tipo: "escolar" } },
        { label: "Sandalias", params: { categoria: "nino", tipo: "sandalias" } },
        { label: "Zapatillas", params: { categoria: "nino", tipo: "zapatillas" } },
        { label: "Niños", params: { categoria: "nino", segmento: "ninos" } },
        { label: "Niñas", params: { categoria: "nino", segmento: "ninas" } },
      ]);
    }

    return make("Categoría", CATEGORIAS.map((cat) => ({
      label: categoryLabel(cat),
      params: cat === "todos" ? {} : { categoria: cat },
    })));
  }, [campana, categoria, coleccion, color, linea, marcas, rangoEdad, segmento, tipo, vista]);

  const isQuickFilterActive = (params: Record<string, string | undefined>) =>
    TAXONOMY_KEYS.every((key) => (searchParams.get(key) ?? "") === (params[key] ?? ""));

  const showContextualFilterGroup = useMemo(() => {
    if (contextualFilters.title === "Categoría") return false;

    if (contextualFilters.items.length !== primaryFilters.items.length) return true;

    return contextualFilters.items.some((item, index) => {
      const primaryItem = primaryFilters.items[index];
      if (!primaryItem) return true;
      if (item.label !== primaryItem.label) return true;

      return TAXONOMY_KEYS.some(
        (key) => (item.params[key] ?? "") !== (primaryItem.params[key] ?? "")
      );
    });
  }, [contextualFilters, primaryFilters]);

  const breadcrumbs = useMemo<CatalogBreadcrumb[]>(() => {
    const items: CatalogBreadcrumb[] = [];

    const pushCrumb = (label: string, params: Record<string, string | undefined>) => {
      items.push({ label, params });
    };

    const sectionParams: Record<string, string | undefined> = {};

    if (vista === "marcas") {
      sectionParams.vista = "marcas";
      pushCrumb("Marcas", { ...sectionParams });
    } else if (categoria !== "todos") {
      sectionParams.categoria = categoria;
      pushCrumb(categoryLabel(categoria), { ...sectionParams });
    }

    if (campana) {
      const params: Record<string, string | undefined> = { ...sectionParams, campana };
      if (linea) params.linea = linea;
      pushCrumb(humanizeSlug(campana), params);
    }

    if (coleccion) {
      const params: Record<string, string | undefined> = { ...sectionParams, campana: campana || undefined, coleccion };
      pushCrumb(humanizeSlug(coleccion), params);
    }

    if (linea) {
      const params = {
        ...sectionParams,
        campana: campana || undefined,
        coleccion: coleccion || undefined,
        linea,
      };
      pushCrumb(humanizeSlug(linea), params);
    }

    if (tipo) {
      const params = {
        ...sectionParams,
        campana: campana || undefined,
        coleccion: coleccion || undefined,
        linea: linea || undefined,
        tipo,
      };
      pushCrumb(humanizeSlug(tipo), params);
    }

    if (estilo) {
      const params = {
        ...sectionParams,
        campana: campana || undefined,
        coleccion: coleccion || undefined,
        linea: linea || undefined,
        tipo: tipo || undefined,
        estilo,
      };
      pushCrumb(humanizeSlug(estilo), params);
    }

    if (segmento) {
      const params = {
        ...sectionParams,
        campana: campana || undefined,
        coleccion: coleccion || undefined,
        linea: linea || undefined,
        tipo: tipo || undefined,
        segmento,
      };
      pushCrumb(categoryLabel(segmento), params);
    }

    if (rangoEdad) {
      const params = {
        ...sectionParams,
        campana: campana || undefined,
        coleccion: coleccion || undefined,
        linea: linea || undefined,
        tipo: tipo || undefined,
        segmento: segmento || undefined,
        rangoEdad,
      };
      pushCrumb(`${rangoEdad} años`, params);
    }

    if (color) {
      const params = {
        ...sectionParams,
        campana: campana || undefined,
        coleccion: coleccion || undefined,
        linea: linea || undefined,
        tipo: tipo || undefined,
        segmento: segmento || undefined,
        color,
      };
      pushCrumb(humanizeSlug(color), params);
    }

    if (marca && marca !== "todas") {
      pushCrumb(marca, { vista: "marcas", marca });
    }

    if (marcaSlug) {
      pushCrumb(humanizeSlug(marcaSlug), { vista: "marcas", marcaSlug });
    }

    return items;
  }, [campana, categoria, coleccion, color, estilo, linea, marca, marcaSlug, rangoEdad, segmento, tipo, vista]);

  const hasActiveSummaryFilters =
    Boolean(trimmedQuery) ||
    TAXONOMY_KEYS.some((key) => Boolean(searchParams.get(key)));

  return (
    <main className="products-page">
      <div className="page-hero">
        <h1 className="page-hero-title">
          {pageTitle}
        </h1>
        <p className="page-hero-sub">{pageSubtitle}</p>
      </div>

      <div className="products-layout">
        {/* Sidebar filtros */}
        <aside className={`filters-sidebar ${showFilters ? "filters-open" : ""}`}>
          <div className="filters-header">
            <h3>Filtros</h3>
            <button className="filters-close-btn" onClick={() => setShowFilters(false)}>
              <X size={18} />
            </button>
          </div>

          {showContextualFilterGroup && (
            <div className="filter-group">
              <h4 className="filter-label">{contextualFilters.title}</h4>
              <div className="filter-options">
                {contextualFilters.items.map((item) => (
                  <button
                    key={`${contextualFilters.title}-${item.label}`}
                    onClick={() => applyQuickFilter(item.params)}
                    className={`filter-option ${isQuickFilterActive(item.params) ? "active" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-group">
            <h4 className="filter-label">Precio máximo: S/ {effectiveMaxPrecio}</h4>
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              value={effectiveMaxPrecio}
              disabled={priceBounds.max === 0}
              onChange={(e) => setMaxPrecio(Number(e.target.value))}
              className="price-range"
            />
            <div className="price-range-labels">
              <span>S/ {priceBounds.min}</span>
              <span>S/ {priceBounds.max}</span>
            </div>
          </div>
        </aside>

        <div className="products-main">
          {/* Toolbar */}
          <div className="products-toolbar">
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              {query && (
                <button onClick={() => handleSearch("")} className="search-clear">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="toolbar-right">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="default">Ordenar por</option>
                <option value="precio-asc">Precio: Menor a Mayor</option>
                <option value="precio-desc">Precio: Mayor a Menor</option>
                <option value="nombre">Nombre A-Z</option>
              </select>

              <button className="filters-toggle-btn" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal size={16} />
                Filtros
              </button>
            </div>
          </div>

          {breadcrumbs.length > 1 && (
            <nav className="catalog-breadcrumbs" aria-label="Navegación del catálogo">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={`${crumb.label}-${index}`} className="catalog-breadcrumb-item">
                    <button
                      type="button"
                      className={`catalog-breadcrumb-btn ${isLast ? "is-current" : ""}`}
                      onClick={() => applyQuickFilter(crumb.params)}
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

          <div className="category-chip-block">
            <span className="category-chip-label">{primaryFilters.title}</span>
            <div className="category-chips category-chips-primary">
              {primaryFilters.items.map((item) => (
                <button
                  key={`primary-chip-${item.label}`}
                  onClick={() => applyQuickFilter(item.params)}
                  className={`category-chip ${isQuickFilterActive(item.params) ? "active" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {showContextualFilterGroup && (
            <div className="category-chip-block">
              <span className="category-chip-label">{contextualFilters.title}</span>
              <div className="category-chips">
                {contextualFilters.items.map((item) => (
                  <button
                    key={`chip-${contextualFilters.title}-${item.label}`}
                    onClick={() => applyQuickFilter(item.params)}
                    className={`category-chip ${isQuickFilterActive(item.params) ? "active" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasActiveSummaryFilters && (
            <div className="products-active-summary" aria-label="Resumen de filtros activos">
              {trimmedQuery && <span className="products-active-pill">Búsqueda: {trimmedQuery}</span>}
              {categoria !== "todos" && <span className="products-active-pill">Categoría: {categoryLabel(categoria)}</span>}
              {vista === "marcas" && <span className="products-active-pill">Vista: Marcas</span>}
              {marca !== "todas" && <span className="products-active-pill">Marca: {marca}</span>}
              {marcaSlug && <span className="products-active-pill">Marca: {humanizeSlug(marcaSlug)}</span>}
              {campana && <span className="products-active-pill">Campaña: {humanizeSlug(campana)}</span>}
              {promocion && <span className="products-active-pill">Promoción: {humanizeSlug(promocion)}</span>}
              {coleccion && <span className="products-active-pill">Colección: {humanizeSlug(coleccion)}</span>}
              {tipo && <span className="products-active-pill">Tipo: {humanizeSlug(tipo)}</span>}
              {linea && <span className="products-active-pill">Línea: {humanizeSlug(linea)}</span>}
              {estilo && <span className="products-active-pill">Estilo: {humanizeSlug(estilo)}</span>}
              {segmento && <span className="products-active-pill">Segmento: {humanizeSlug(segmento)}</span>}
              {rangoEdad && <span className="products-active-pill">Rango: {rangoEdad}</span>}
              {color && <span className="products-active-pill">Color: {humanizeSlug(color)}</span>}
            </div>
          )}

          {loading ? (
            <div className="products-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state" role="status" aria-live="polite">
              <AlertTriangle size={28} />
              <p>{error} Revisa tu conexión y vuelve a intentarlo.</p>
              <button
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
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>
                {trimmedQuery
                  ? `No encontramos resultados para "${trimmedQuery}" con los filtros actuales.`
                  : "No se encontraron productos con estos filtros."}
              </p>
              <button onClick={resetFilters} className="btn-primary">
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { fetchProducts } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import ProductCard from "@/domains/productos/components/ProductCard";
import { categoryLabel } from "@/utils/labels";
import { getProductColors } from "@/utils/colors";

const CATEGORIAS = ["todos", "hombre", "dama", "juvenil", "nino", "bebe", "cyver-wiw"];

function categoryMatches(productCategory: string, selectedCategory: string) {
  if (selectedCategory === "todos") return true;
  if (selectedCategory === "mujer") return productCategory === "mujer" || productCategory === "dama";
  return productCategory.toLowerCase() === selectedCategory.toLowerCase();
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [maxPrecio, setMaxPrecio] = useState(0);

  const categoria = searchParams.get("categoria") ?? "todos";
  const vista = searchParams.get("vista");
  const marca = searchParams.get("marca") ?? "todas";
  const query = searchParams.get("buscar") ?? "";

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query), 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  const baseFiltered = useMemo(() => {
    let result = [...products];

    if (categoria !== "todos") {
      result = result.filter((p) => categoryMatches(p.categoria, categoria));
    }

    if (vista === "marcas" && marca !== "todas") {
      result = result.filter((p) => p.marca?.toLowerCase() === marca.toLowerCase());
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q) ||
          p.marca?.toLowerCase().includes(q) ||
          p.tipoCalzado?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q) ||
          getProductColors(p).some((color) => color.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, categoria, search, vista, marca]);

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

  const resetFilters = () => {
    setSearch("");
    setMaxPrecio(0);
    const params = new URLSearchParams(searchParams);
    params.delete("buscar");
    setSearchParams(params);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("buscar", value);
    } else {
      params.delete("buscar");
    }
    setSearchParams(params);
  };

  const handleCategoria = (cat: string) => {
    if (cat === "todos") {
      searchParams.delete("categoria");
    } else {
      searchParams.set("categoria", cat);
    }
    searchParams.delete("vista");
    searchParams.delete("marca");
    setSearchParams(searchParams);
  };

  const handleMarca = (brand: string) => {
    searchParams.set("vista", "marcas");
    searchParams.delete("categoria");
    if (brand === "todas") {
      searchParams.delete("marca");
    } else {
      searchParams.set("marca", brand);
    }
    setSearchParams(searchParams);
  };

  return (
    <main className="products-page">
      <div className="page-hero">
        <h1 className="page-hero-title">
          {vista === "marcas"
            ? "Marcas"
            : categoria === "todos"
            ? "Todos los Productos"
            : `Calzado ${categoryLabel(categoria)}`}
        </h1>
        <p className="page-hero-sub">
          {filtered.length} producto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>
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

          <div className="filter-group">
            <h4 className="filter-label">Categoría</h4>
            <div className="filter-options">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoria(cat)}
                  className={`filter-option ${categoria === cat || (cat === "todos" && !searchParams.get("categoria")) ? "active" : ""}`}
                >
                  {categoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

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
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              {search && (
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

          {/* Category chips */}
          {vista === "marcas" ? (
            <div className="category-chips">
              {marcas.map((brand) => (
                <button
                  key={brand}
                  onClick={() => handleMarca(brand)}
                  className={`category-chip ${marca === brand || (brand === "todas" && !searchParams.get("marca")) ? "active" : ""}`}
                >
                  {brand === "todas" ? "Todas las marcas" : brand}
                </button>
              ))}
            </div>
          ) : (
            <div className="category-chips">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoria(cat)}
                  className={`category-chip ${categoria === cat || (cat === "todos" && !searchParams.get("categoria")) ? "active" : ""}`}
                >
                  {categoryLabel(cat)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="products-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No se encontraron productos con estos filtros.</p>
              <button onClick={resetFilters} className="btn-primary">
                Limpiar filtros
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

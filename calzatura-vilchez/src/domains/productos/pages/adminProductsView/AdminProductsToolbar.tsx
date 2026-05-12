import { Plus, Search } from "lucide-react";
import { CATEGORIAS } from "@/domains/productos/utils/commercialRules";
import { categoryLabel } from "@/utils/labels";
import type { FeaturedFilter, StockFilter } from "../adminProductsListFilters";

type Props = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  stockFilter: StockFilter;
  setStockFilter: (value: StockFilter) => void;
  featuredFilter: FeaturedFilter;
  setFeaturedFilter: (value: FeaturedFilter) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  openCreate: () => void;
};

export function AdminProductsToolbar({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  featuredFilter,
  setFeaturedFilter,
  hasActiveFilters,
  clearFilters,
  openCreate,
}: Props) {
  return (
    <div className="admin-toolbar">
      <div className="admin-search-wrapper">
        <Search size={17} />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por código, nombre, marca, color, categoría, tipo o descripción"
        />
      </div>
      <div className="admin-filter-grid">
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-input">
          <option value="todos">Todas las categorías</option>
          {CATEGORIAS.map((category) => (
            <option key={category} value={category}>{categoryLabel(category)}</option>
          ))}
        </select>
        <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="form-input">
          <option value="todos">Todo el stock</option>
          <option value="con-stock">Con stock saludable</option>
          <option value="bajo-stock">Stock bajo</option>
          <option value="sin-stock">Sin stock</option>
        </select>
        <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value as FeaturedFilter)} className="form-input">
          <option value="todos">Todos</option>
          <option value="destacados">Destacados</option>
          <option value="normales">No destacados</option>
        </select>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="btn-outline admin-clear-filters">
            Limpiar
          </button>
        )}
        <button type="button" onClick={openCreate} className="btn-primary admin-toolbar-create">
          <Plus size={16} /> Producto nuevo
        </button>
      </div>
    </div>
  );
}

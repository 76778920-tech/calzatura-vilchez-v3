import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import type { AdminProductsViewModel } from "./useAdminProductsPage";
import { AdminProductModal } from "./adminProductsView/AdminProductModal";
import { AdminProductsCatalogBody } from "./adminProductsView/AdminProductsCatalogBody";
import { AdminProductStockEntryModal } from "./adminProductsView/AdminProductStockEntryModal";
import { AdminProductsStatsBar } from "./adminProductsView/AdminProductsStatsBar";
import { AdminProductsToolbar } from "./adminProductsView/AdminProductsToolbar";

export function AdminProductsView(p: Readonly<AdminProductsViewModel>) {
  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Productos</h1>
        </div>
      </div>

      <AdminProductsStatsBar productCount={p.products.length} stats={p.stats} />

      {p.stats.stockTallaIncoherentes > 0 && (
        <div className="admin-stock-coherence-banner">
          <output className="admin-stock-coherence-banner__live" aria-live="polite">
            <strong>{p.stats.stockTallaIncoherentes}</strong>{" "}
            {p.stats.stockTallaIncoherentes === 1 ? "producto tiene" : "productos tienen"}{" "}
            el total de pares distinto a la suma de la rejilla de tallas (datos legacy o edición incompleta).
            Corrige desde <strong>Editar</strong> para alinear stock y tallas antes de confiar en ingresos o en el modelo.
          </output>
          <button
            type="button"
            className="btn-outline admin-stock-coherence-banner__action"
            onClick={() => p.setStockFilter("stock-talla-mismatch")}
          >
            Ver solo desalineados
          </button>
        </div>
      )}

      <AdminProductsToolbar
        searchTerm={p.searchTerm}
        setSearchTerm={p.setSearchTerm}
        categoryFilter={p.categoryFilter}
        setCategoryFilter={p.setCategoryFilter}
        stockFilter={p.stockFilter}
        setStockFilter={p.setStockFilter}
        featuredFilter={p.featuredFilter}
        setFeaturedFilter={p.setFeaturedFilter}
        hasActiveFilters={p.hasActiveFilters}
        clearFilters={p.clearFilters}
        openCreate={p.openCreate}
      />

      <AdminProductsCatalogBody
        loading={p.loading}
        filteredProducts={p.filteredProducts}
        products={p.products}
        setPreviewImage={p.setPreviewImage}
        openVariant={p.openVariant}
        openEdit={p.openEdit}
        openStockEntry={p.openStockEntry}
        handleDelete={p.handleDelete}
      />

      {p.showModal && <AdminProductModal {...p} />}

      {p.showStockModal && p.stockModalProduct && (
        <AdminProductStockEntryModal
          product={p.stockModalProduct}
          onClose={p.closeStockModal}
          onSubmit={p.handleStockEntry}
        />
      )}

      {p.previewImage && (
        <ImagePreviewModal
          src={p.previewImage.src}
          title={p.previewImage.title}
          subtitle={p.previewImage.subtitle}
          onClose={() => p.setPreviewImage(null)}
        />
      )}
    </div>
  );
}

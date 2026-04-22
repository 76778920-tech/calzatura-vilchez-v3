import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  Link as LinkIcon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  addProduct,
  deleteProduct,
  deleteProductCode,
  fetchProductCodes,
  fetchProducts,
  updateProduct,
  upsertProductCode,
} from "@/domains/productos/services/products";
import {
  calculatePriceRange,
  deleteProductFinancial,
  fetchProductFinancials,
  upsertProductFinancial,
} from "@/domains/ventas/services/finance";
import type { Product, ProductFinancial } from "@/types";
import { capitalizeWords, formatColors, getProductColors, parseColorList } from "@/utils/colors";
import { categoryLabel } from "@/utils/labels";
import { aggregateColorStock, sumColorSizeStock, sumSizeStock } from "@/utils/stock";
import ImagePreviewModal from "@/domains/administradores/components/ImagePreviewModal";
import {
  compressImageFile,
  normalizeCloudinaryImageUrl,
  uploadImageToCloudinary,
} from "@/domains/administradores/services/cloudinary";
import toast from "react-hot-toast";

type AdminProduct = Product & { codigo?: string; finanzas?: ProductFinancial };
type ProductForm = Omit<Product, "id"> & {
  codigo: string;
  costoCompra: number;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  tallaStock: Record<string, number>;
  colorStock: Record<string, Record<string, number>>;
};

const CATEGORY_SIZES: Record<string, string[]> = {
  hombre: ["37", "38", "39", "40", "41", "42", "43", "44", "45"],
  dama: ["32", "33", "34", "35", "36", "37", "38", "39", "40"],
  juvenil: ["33", "34", "35", "36", "37", "38"],
  nino: ["24", "25", "26", "27", "28", "29", "30", "31", "32"],
  bebe: ["18", "19", "20", "21", "22"],
};
const CATEGORIAS = Object.keys(CATEGORY_SIZES);
const FOOTWEAR_TYPES_BY_CATEGORY: Record<string, string[]> = {
  dama: [
    "Zapatillas",
    "Sandalias",
    "Zapatos Casuales",
    "Zapatos de Vestir",
    "Mocasines",
    "Botas y Botines",
    "Ballerinas",
    "Pantuflas",
    "Flip Flops",
  ],
  hombre: [
    "Zapatillas",
    "Zapatos de Vestir",
    "Zapatos Casuales",
    "Sandalias",
    "Botines",
    "Zapatos de Seguridad",
    "Pantuflas",
  ],
  nino: [
    "Escolar",
    "Sandalias",
    "Zapatillas",
    "Zapatos",
  ],
  juvenil: [
    "Escolar",
    "Zapatillas",
    "Sandalias",
    "Zapatos",
    "Botines",
  ],
  bebe: [
    "Zapatos",
    "Sandalias",
    "Zapatillas",
    "Pantuflas",
  ],
};
const LOW_STOCK_LIMIT = 5;
const IMAGE_SLOTS = 2;
const COLOR_SLOTS = 5;

const EMPTY_FORM: ProductForm = {
  codigo: "",
  nombre: "",
  precio: 0,
  descripcion: "",
  imagen: "",
  imagenes: [],
  stock: 0,
  categoria: "",
  tipoCalzado: "",
  tallas: [],
  tallaStock: {},
  colorStock: {},
  marca: "",
  color: "",
  colores: [],
  destacado: false,
  costoCompra: 0,
  margenMinimo: 25,
  margenObjetivo: 45,
  margenMaximo: 75,
};

type StockFilter = "todos" | "con-stock" | "bajo-stock" | "sin-stock";
type FeaturedFilter = "todos" | "destacados" | "normales";

function normalizeProductCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

function isValidProductCode(value: string) {
  return /^[A-Z0-9-]{3,40}$/.test(value);
}

function sanitizeDecimal(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  const decimal = decimals.join("").slice(0, 2);
  return decimal ? `${integer || "0"}.${decimal}` : integer;
}

function toPositiveNumber(value: string) {
  const sanitized = sanitizeDecimal(value);
  return sanitized ? Number(sanitized) : 0;
}

function toPositiveInteger(value: string) {
  const sanitized = value.replace(/\D/g, "");
  return sanitized ? Number(sanitized) : 0;
}

function normalizeImageSlots(images?: string[], fallback = "") {
  const source = images && images.length > 0 ? images : fallback ? [fallback] : [];
  return Array.from({ length: IMAGE_SLOTS }, (_, index) => source[index] ?? "");
}

function editableImageSlots(images?: string[], fallback = "") {
  return Array.from({ length: IMAGE_SLOTS }, (_, index) => images?.[index] ?? (index === 0 ? fallback : ""));
}

function normalizeColorSlots(colors?: string[], fallback = "") {
  const source = colors && colors.length > 0 ? colors : parseColorList(fallback);
  return Array.from({ length: COLOR_SLOTS }, (_, index) => source[index] ?? "");
}

function sizesForCategory(category: string) {
  return CATEGORY_SIZES[category] ?? [];
}

function footwearTypesForCategory(category: string) {
  return FOOTWEAR_TYPES_BY_CATEGORY[category] ?? [];
}

function normalizeAdminCategory(category = "hombre") {
  if (category === "mujer") return "dama";
  return CATEGORY_SIZES[category] ? category : "hombre";
}

function filterStockByCategory(tallaStock: Record<string, number>, category: string) {
  if (!CATEGORY_SIZES[category]) return {};
  const allowed = new Set(sizesForCategory(category));
  return Object.fromEntries(Object.entries(tallaStock).filter(([size]) => allowed.has(size)));
}

function filterColorStockByCategory(
  colorStock: Record<string, Record<string, number>>,
  category: string,
  colors: string[]
) {
  if (!CATEGORY_SIZES[category]) return {};
  const allowed = new Set(sizesForCategory(category));

  return colors.reduce<Record<string, Record<string, number>>>((acc, color) => {
    const stockBySize = colorStock[color] ?? {};
    acc[color] = Object.fromEntries(
      Object.entries(stockBySize)
        .filter(([size]) => allowed.has(size))
        .map(([size, qty]) => [size, Math.max(0, Number(qty) || 0)])
    );
    return acc;
  }, {});
}

function colorStockFromProduct(product: Product, colors: string[], tallaStock: Record<string, number>) {
  if (product.colorStock && Object.keys(product.colorStock).length > 0) {
    return filterColorStockByCategory(product.colorStock, product.categoria, colors);
  }
  const firstColor = colors[0];
  return firstColor ? { [firstColor]: tallaStock } : {};
}

function sizesFromStock(tallaStock: Record<string, number>) {
  return Object.entries(tallaStock)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size)
    .sort((a, b) => Number(a) - Number(b));
}

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("todos");
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const load = () => {
    setLoading(true);
    Promise.all([fetchProducts(), fetchProductCodes(), fetchProductFinancials()])
      .then(([items, codes, financials]) => {
        setProducts(items.map((item) => ({
          ...item,
          codigo: codes[item.id] ?? "",
          categoria: normalizeAdminCategory(item.categoria),
          finanzas: financials[item.id],
        })));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const bajoStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_LIMIT).length;
    const destacados = products.filter((p) => p.destacado).length;
    const stockTotal = products.reduce((sum, p) => sum + p.stock, 0);
    return { bajoStock, destacados, stockTotal };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const searchable = [
        product.codigo,
        product.nombre,
        product.marca,
        product.color,
        ...(product.colores ?? []),
        product.categoria,
        product.tipoCalzado,
        categoryLabel(product.categoria),
        product.descripcion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = term === "" || searchable.includes(term);
      const matchesCategory = categoryFilter === "todos" || product.categoria === categoryFilter;
      const matchesStock =
        stockFilter === "todos" ||
        (stockFilter === "con-stock" && product.stock > LOW_STOCK_LIMIT) ||
        (stockFilter === "bajo-stock" && product.stock > 0 && product.stock <= LOW_STOCK_LIMIT) ||
        (stockFilter === "sin-stock" && product.stock === 0);
      const matchesFeatured =
        featuredFilter === "todos" ||
        (featuredFilter === "destacados" && Boolean(product.destacado)) ||
        (featuredFilter === "normales" && !product.destacado);

      return matchesSearch && matchesCategory && matchesStock && matchesFeatured;
    });
  }, [products, searchTerm, categoryFilter, stockFilter, featuredFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    categoryFilter !== "todos" ||
    stockFilter !== "todos" ||
    featuredFilter !== "todos";

  const formPriceRange = useMemo(
    () => calculatePriceRange(
      form.costoCompra,
      form.margenMinimo,
      form.margenObjetivo,
      form.margenMaximo
    ),
    [form.costoCompra, form.margenMinimo, form.margenObjetivo, form.margenMaximo]
  );

  const currentImages = normalizeImageSlots(form.imagenes, form.imagen);
  const currentColors = normalizeColorSlots(form.colores, form.color);
  const activeColors = currentColors.map(capitalizeWords).filter(Boolean);
  const currentStock = sumColorSizeStock(form.colorStock) || sumSizeStock(form.tallaStock);
  const currentSizes = sizesForCategory(form.categoria);
  const currentFootwearTypes = footwearTypesForCategory(form.categoria);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      imagenes: normalizeImageSlots(),
      colores: normalizeColorSlots(),
    });
    setShowModal(true);
  };

  const openEdit = (product: AdminProduct) => {
    const { id: _id, finanzas: _finanzas, codigo: _codigo, ...productData } = product;
    void _id;
    void _finanzas;
    void _codigo;
    const categoria = normalizeAdminCategory(product.categoria);
    const tallaStock = filterStockByCategory(
      product.tallaStock ?? Object.fromEntries((product.tallas ?? []).map((size) => [size, 1])),
      categoria
    );
    const productColors = normalizeColorSlots(getProductColors(product));
    const activeProductColors = productColors.map(capitalizeWords).filter(Boolean);
    const colorStock = filterColorStockByCategory(
      colorStockFromProduct({ ...product, categoria }, activeProductColors, tallaStock),
      categoria,
      activeProductColors
    );
    const aggregateStock = aggregateColorStock(colorStock);

    setEditingId(product.id);
    setForm({
      ...EMPTY_FORM,
      ...productData,
      categoria,
      codigo: product.codigo ?? "",
      tallas: sizesFromStock(aggregateStock),
      tallaStock: aggregateStock,
      colorStock,
      stock: sumColorSizeStock(colorStock),
      marca: product.marca ?? "",
      tipoCalzado: footwearTypesForCategory(categoria).includes(product.tipoCalzado ?? "") ? product.tipoCalzado ?? "" : "",
      color: formatColors(getProductColors(product)),
      colores: productColors,
      imagenes: normalizeImageSlots(product.imagenes, product.imagen),
      destacado: product.destacado ?? false,
      costoCompra: product.finanzas?.costoCompra ?? 0,
      margenMinimo: product.finanzas?.margenMinimo ?? 25,
      margenObjetivo: product.finanzas?.margenObjetivo ?? 45,
      margenMaximo: product.finanzas?.margenMaximo ?? 75,
    });
    setShowModal(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("todos");
    setStockFilter("todos");
    setFeaturedFilter("todos");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImageFile(file, 1100, 0.78);
      const imageUrl = await uploadImageToCloudinary(compressed, file.name);
      setForm((current) => {
        const imagenes = editableImageSlots(current.imagenes, current.imagen);
        imagenes[index] = imageUrl;
        const cleanImages = imagenes.filter(Boolean);
        return { ...current, imagenes, imagen: cleanImages[0] ?? "" };
      });
    } catch {
      toast.error("No se pudo subir la imagen a Cloudinary");
    } finally {
      setCompressing(false);
      event.target.value = "";
    }
  };

  const updateImageUrl = (index: number, value: string) => {
    const imagenes = editableImageSlots(form.imagenes, form.imagen);
    imagenes[index] = value.trim();
    const cleanImages = imagenes.filter(Boolean);
    setForm({ ...form, imagenes, imagen: cleanImages[0] ?? "" });
  };

  const validateImageUrl = (index: number, value: string) => {
    const normalized = normalizeCloudinaryImageUrl(value);
    if (!normalized) {
      updateImageUrl(index, "");
      return;
    }

    try {
      new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
      updateImageUrl(index, normalized);
    } catch {
      toast.error("Ingresa una URL valida de imagen");
    }
  };

  const clearImage = (index: number) => {
    const imagenes = editableImageSlots(form.imagenes, form.imagen);
    imagenes[index] = "";
    const cleanImages = imagenes.filter(Boolean);
    setForm({ ...form, imagenes, imagen: cleanImages[0] ?? "" });
  };

  const updateColor = (index: number, value: string) => {
    const colores = normalizeColorSlots(form.colores, form.color);
    const previousColor = capitalizeWords(colores[index] ?? "");
    colores[index] = value;
    const cleanColors = colores.map(capitalizeWords).filter(Boolean);
    const nextColor = capitalizeWords(value);
    const nextColorStock = { ...form.colorStock };

    if (previousColor && nextColor && previousColor !== nextColor && nextColorStock[previousColor]) {
      nextColorStock[nextColor] = nextColorStock[previousColor];
      delete nextColorStock[previousColor];
    }

    cleanColors.forEach((color) => {
      nextColorStock[color] = nextColorStock[color] ?? {};
    });

    Object.keys(nextColorStock).forEach((color) => {
      if (!cleanColors.includes(color)) delete nextColorStock[color];
    });

    const filteredColorStock = filterColorStockByCategory(nextColorStock, form.categoria, cleanColors);
    const tallaStock = aggregateColorStock(filteredColorStock);
    setForm({
      ...form,
      colores,
      color: formatColors(cleanColors),
      colorStock: filteredColorStock,
      tallaStock,
      tallas: sizesFromStock(tallaStock),
      stock: sumColorSizeStock(filteredColorStock),
    });
  };

  const updateColorTallaStock = (color: string, talla: string, quantity: number) => {
    const colorStock = {
      ...form.colorStock,
      [color]: {
        ...(form.colorStock[color] ?? {}),
        [talla]: Math.max(0, Number(quantity) || 0),
      },
    };
    const tallaStock = aggregateColorStock(colorStock);
    setForm({
      ...form,
      colorStock,
      tallaStock,
      tallas: sizesFromStock(tallaStock),
      stock: sumColorSizeStock(colorStock),
    });
  };

  const updateCategory = (categoria: string) => {
    const colors = normalizeColorSlots(form.colores, form.color).map(capitalizeWords).filter(Boolean);
    const colorStock = filterColorStockByCategory(form.colorStock, categoria, colors);
    const tallaStock = aggregateColorStock(colorStock);
    const validTypes = footwearTypesForCategory(categoria);
    setForm({
      ...form,
      categoria,
      tipoCalzado: validTypes.includes(form.tipoCalzado ?? "") ? form.tipoCalzado : "",
      colorStock,
      tallaStock,
      tallas: sizesFromStock(tallaStock),
      stock: sumColorSizeStock(colorStock),
    });
  };

  const handleSave = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    const codigo = normalizeProductCode(form.codigo ?? "");
    const colores = normalizeColorSlots(form.colores, form.color)
      .map(capitalizeWords)
      .filter(Boolean)
      .slice(0, COLOR_SLOTS);
    const imagenes = normalizeImageSlots(form.imagenes, form.imagen)
      .map(normalizeCloudinaryImageUrl)
      .filter(Boolean);
    const colorStock = filterColorStockByCategory(form.colorStock, form.categoria, colores);
    const tallaStock = aggregateColorStock(colorStock);
    const totalStock = sumColorSizeStock(colorStock);

    if (!isValidProductCode(codigo)) {
      toast.error("El código debe tener 3 a 40 caracteres: letras, números o guiones");
      return;
    }
    if (!form.nombre.trim() || form.precio <= 0) {
      toast.error("Nombre y precio son requeridos");
      return;
    }
    if (!form.categoria || !CATEGORY_SIZES[form.categoria]) {
      toast.error("Selecciona la categorÃ­a del producto");
      return;
    }
    if (!form.marca?.trim()) {
      toast.error("La marca es obligatoria");
      return;
    }
    if (colores.length === 0) {
      toast.error("Registra al menos un color del producto");
      return;
    }
    if (totalStock <= 0) {
      toast.error("Registra al menos una talla con stock");
      return;
    }
    if (colores.some((color) => sumSizeStock(colorStock[color] ?? {}) <= 0)) {
      toast.error("Cada color registrado debe tener al menos una talla con stock");
      return;
    }
    if (!form.tipoCalzado?.trim()) {
      toast.error("Selecciona el tipo de calzado");
      return;
    }
    if (!footwearTypesForCategory(form.categoria).includes(form.tipoCalzado.trim())) {
      toast.error("Selecciona un tipo de calzado acorde a la categorÃ­a");
      return;
    }
    if (form.costoCompra <= 0) {
      toast.error("Registra el costo real de compra");
      return;
    }
    if (imagenes.length === 0) {
      toast.error("Agrega al menos una imagen del producto");
      return;
    }
    if (form.margenMinimo > form.margenObjetivo || form.margenObjetivo > form.margenMaximo) {
      toast.error("Ordena los márgenes: mínimo, objetivo y máximo");
      return;
    }

    const range = calculatePriceRange(
      form.costoCompra,
      form.margenMinimo,
      form.margenObjetivo,
      form.margenMaximo
    );
    if (form.precio < range.precioMinimo || form.precio > range.precioMaximo) {
      toast.error("El precio público debe estar dentro del rango óptimo de venta");
      return;
    }

    setSaving(true);
    try {
      const payload: Omit<Product, "id"> = {
        nombre: form.nombre.trim(),
        precio: form.precio,
        descripcion: form.descripcion.trim(),
        imagen: imagenes[0] ?? "",
        imagenes,
        stock: totalStock,
        categoria: form.categoria,
        tipoCalzado: form.tipoCalzado.trim(),
        tallas: sizesFromStock(tallaStock),
        tallaStock: Object.fromEntries(Object.entries(tallaStock).filter(([, qty]) => qty > 0)),
        colorStock: Object.fromEntries(
          Object.entries(colorStock).map(([color, stockBySize]) => [
            color,
            Object.fromEntries(Object.entries(stockBySize).filter(([, qty]) => qty > 0)),
          ])
        ),
        marca: form.marca.trim(),
        color: formatColors(colores),
        colores,
        destacado: form.destacado,
      };
      const financialPayload = {
        costoCompra: form.costoCompra,
        ...range,
      };
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 12000)
      );

      const op = editingId
        ? Promise.all([
          updateProduct(editingId, payload),
          upsertProductCode(editingId, codigo),
          upsertProductFinancial(editingId, financialPayload),
        ])
        : addProduct(payload).then((productId) =>
          Promise.all([
            upsertProductCode(productId, codigo),
            upsertProductFinancial(productId, financialPayload),
          ])
        );
      await Promise.race([op, timeout]);
      toast.success(editingId ? "Producto actualizado" : "Producto creado");
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
      const isPermissionError =
        code.includes("permission-denied") ||
        msg.includes("permission-denied") ||
        msg.includes("PERMISSION_DENIED") ||
        msg.toLowerCase().includes("missing or insufficient permissions");
      if (msg === "TIMEOUT") {
        toast.error("Tiempo agotado. Ejecuta: firebase deploy --only firestore:rules");
      } else if (isPermissionError) {
        toast.error("Sin permisos. Ejecuta: firebase deploy --only firestore:rules");
      } else {
        toast.error(`Error: ${msg || "no se pudo guardar el producto"}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`¿Eliminar "${product.nombre}"?`)) return;
    try {
      await Promise.all([
        deleteProduct(product.id),
        deleteProductCode(product.id),
        deleteProductFinancial(product.id),
      ]);
      toast.success("Producto eliminado");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Productos</h1>
        </div>
      </div>

      <div className="admin-stats-grid product-stats-grid">
        <div className="stat-card admin-metric-card">
          <Boxes size={22} />
          <div>
            <span>Total productos</span>
            <strong>{products.length}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <AlertTriangle size={22} />
          <div>
            <span>Stock bajo</span>
            <strong>{stats.bajoStock}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <PackageCheck size={22} />
          <div>
            <span>Stock total</span>
            <strong>{stats.stockTotal}</strong>
          </div>
        </div>
        <div className="stat-card admin-metric-card">
          <Star size={22} />
          <div>
            <span>Destacados</span>
            <strong>{stats.destacados}</strong>
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrapper">
          <Search size={17} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por código, nombre, marca, categoría, tipo o descripción"
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

      {loading ? (
        <div className="products-grid">
          {[...Array(6)].map((_, index) => <div key={index} className="skeleton-card" />)}
        </div>
      ) : (
        <div className="admin-table-wrapper product-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Rango venta</th>
                <th>Stock</th>
                <th>Destacado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} className="admin-empty-cell">
                    {products.length === 0
                      ? "No hay productos. Crea el primero."
                      : "No se encontraron productos con esos filtros."}
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-image-thumb-button"
                      onClick={() => setPreviewImage({
                        src: product.imagen || "/placeholder.jpg",
                        title: product.nombre,
                        subtitle: "Producto",
                      })}
                      aria-label={`Abrir imagen de ${product.nombre}`}
                    >
                      <img
                        src={product.imagen || "/placeholder.jpg"}
                        alt={product.nombre}
                        className="admin-product-img"
                        onError={(event) => { (event.target as HTMLImageElement).src = "/placeholder.jpg"; }}
                      />
                    </button>
                  </td>
                  <td><span className="admin-code-badge">{product.codigo || "SIN-CODIGO"}</span></td>
                  <td>
                    <div className="admin-product-cell">
                      <strong>{product.nombre}</strong>
                      <span>
                        {product.marca || "Sin marca"}
                        {product.color ? ` · ${product.color}` : ""}
                      </span>
                    </div>
                  </td>
                  <td><span className="admin-soft-badge">{categoryLabel(product.categoria)}</span></td>
                  <td><span className="admin-soft-badge">{product.tipoCalzado || "Sin tipo"}</span></td>
                  <td>S/ {product.precio.toFixed(2)}</td>
                  <td>
                    {product.finanzas ? (
                      <div className="admin-range-cell">
                        <strong>S/ {product.finanzas.precioMinimo.toFixed(2)} - S/ {product.finanzas.precioMaximo.toFixed(2)}</strong>
                        <span>Sugerido: S/ {product.finanzas.precioSugerido.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="admin-status-badge muted">Sin costo</span>
                    )}
                  </td>
                  <td>
                    <span className={product.stock === 0 ? "stock-badge out" : product.stock <= LOW_STOCK_LIMIT ? "stock-badge low" : "stock-badge in"}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={product.destacado ? "admin-status-badge featured" : "admin-status-badge muted"}>
                      {product.destacado ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button onClick={() => openEdit(product)} className="action-btn edit-btn" aria-label={`Editar ${product.nombre}`}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(product)} className="action-btn delete-btn" aria-label={`Eliminar ${product.nombre}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal product-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              <div className="product-form-layout">
                <aside className="admin-form-card admin-image-card">
                  <div className="admin-form-card-header">
                    <strong>Galería</strong>
                    <span className="admin-stock-pill">Stock: <strong>{currentStock}</strong></span>
                  </div>
                  <div className="admin-image-grid">
                    {currentImages.map((image, index) => (
                      <div key={index} className="admin-image-slot">
                        <button
                          type="button"
                          className="image-upload-area"
                          onClick={() => {
                            if (compressing) return;
                            if (image) {
                              setPreviewImage({
                                src: image,
                                title: `${form.nombre || "Producto"} - Imagen ${index + 1}`,
                                subtitle: "Galería",
                              });
                              return;
                            }
                            fileInputRefs.current[index]?.click();
                          }}
                          disabled={compressing}
                        >
                          {image ? (
                            <img src={image} alt={`Vista previa ${index + 1}`} className="image-preview" />
                          ) : (
                            <div className="image-upload-placeholder">
                              <Upload size={28} />
                              <span>{compressing ? "Subiendo..." : `Imagen ${index + 1}`}</span>
                              <small>JPG, PNG o WEBP</small>
                            </div>
                          )}
                        </button>
                        <input
                          ref={(element) => { fileInputRefs.current[index] = element; }}
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleFileChange(event, index)}
                          style={{ display: "none" }}
                        />
                        <div className="input-wrapper">
                          <LinkIcon size={14} className="input-icon" />
                          <input
                            type="text"
                            inputMode="url"
                            value={image.startsWith("data:") ? "" : image}
                            onChange={(event) => updateImageUrl(index, event.target.value)}
                            onBlur={(event) => validateImageUrl(index, event.target.value)}
                            placeholder={`URL de imagen ${index + 1}`}
                            className="form-input with-icon with-action"
                          />
                          {image && (
                            <button
                              type="button"
                              className="input-action-btn"
                              onClick={() => clearImage(index)}
                              aria-label={`Quitar imagen ${index + 1}`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="product-form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Código interno *</label>
                      <input
                        value={form.codigo ?? ""}
                        onChange={(event) => setForm({ ...form, codigo: normalizeProductCode(event.target.value) })}
                        required
                        className="form-input"
                        placeholder="CV-FOR-001"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        value={form.nombre}
                        onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                        required
                        className="form-input"
                        placeholder="Zapato formal negro"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Marca *</label>
                      <input
                        value={form.marca ?? ""}
                        onChange={(event) => setForm({ ...form, marca: event.target.value })}
                        required
                        className="form-input"
                        placeholder="Calzatura Vilchez"
                      />
                    </div>
                    <div className="form-group">
                      <label>Colores <span className="form-hint">(hasta 5 colores, uno por campo)</span></label>
                      <div className="admin-color-grid">
                        {currentColors.map((color, index) => (
                          <input
                            key={index}
                            value={color}
                            onChange={(event) => updateColor(index, event.target.value)}
                            className="form-input"
                            placeholder={`Color ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-row product-core-row">
                    <div className="form-group">
                      <label>Categoría</label>
                      <select value={form.categoria} onChange={(event) => updateCategory(event.target.value)} className="form-input" required>
                        <option value="">Selecciona la categorÃ­a</option>
                        {CATEGORIAS.map((category) => (
                          <option key={category} value={category}>{categoryLabel(category)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tipo de calzado *</label>
                      <select
                        value={form.tipoCalzado ?? ""}
                        onChange={(event) => setForm({ ...form, tipoCalzado: event.target.value })}
                        required
                        className="form-input"
                        disabled={!form.categoria}
                      >
                        <option value="">Selecciona un tipo</option>
                        {currentFootwearTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Precio (S/) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.precio === 0 ? "" : form.precio}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setForm({ ...form, precio: toPositiveNumber(event.target.value) })}
                        required
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="admin-finance-box">
                    <div>
                      <span className="admin-page-kicker admin-finance-kicker">Rentabilidad <span>(Rango óptimo de venta)</span></span>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Costo real de compra (S/) *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.costoCompra === 0 ? "" : form.costoCompra}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => setForm({ ...form, costoCompra: toPositiveNumber(event.target.value) })}
                          required
                          className="form-input"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label>Margen objetivo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenObjetivo}
                          onChange={(event) => setForm({ ...form, margenObjetivo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Margen mínimo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenMinimo}
                          onChange={(event) => setForm({ ...form, margenMinimo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Margen máximo (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.margenMaximo}
                          onChange={(event) => setForm({ ...form, margenMaximo: Math.min(300, toPositiveNumber(event.target.value)) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="admin-price-preview">
                      <span>Mínimo: S/ {formPriceRange.precioMinimo.toFixed(2)}</span>
                      <strong>Sugerido: S/ {formPriceRange.precioSugerido.toFixed(2)}</strong>
                      <span>Máximo: S/ {formPriceRange.precioMaximo.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="admin-stock-heading">
                      <label>Stock por color y talla</label>
                    </div>
                    {activeColors.length === 0 ? (
                      <p className="admin-empty">Primero registra al menos un color para asignar tallas.</p>
                    ) : currentSizes.length === 0 ? (
                      <p className="admin-empty">Selecciona la categoria para ver sus tallas.</p>
                    ) : (
                      <div className="admin-color-stock-groups">
                        {activeColors.map((color) => (
                          <section key={color} className="admin-color-stock-group">
                            <div className="admin-color-stock-title">
                              <strong>{color}</strong>
                              <span>{sumSizeStock(form.colorStock[color] ?? {})} pares</span>
                            </div>
                            <div className="admin-size-stock-grid">
                              {currentSizes.map((size) => (
                                <label key={`${color}-${size}`} className="admin-size-stock-item">
                                  <span>{size}</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.colorStock[color]?.[size] ?? 0}
                                    onChange={(event) => updateColorTallaStock(color, size, toPositiveInteger(event.target.value))}
                                  />
                                </label>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.destacado ?? false}
                      onChange={(event) => setForm({ ...form, destacado: event.target.checked })}
                    />
                    Producto destacado
                  </label>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      value={form.descripcion}
                      onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                      rows={3}
                      className="form-input"
                      placeholder="Material, acabado, ocasión de uso..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving || compressing} className="btn-primary">
                  {saving ? "Guardando..." : compressing ? "Subiendo imagen..." : editingId ? "Actualizar" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}

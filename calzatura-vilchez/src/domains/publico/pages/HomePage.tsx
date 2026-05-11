import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Shield,
  Truck,
} from "lucide-react";
import ProductCard from "@/domains/productos/components/ProductCard";
import HomeHeroSection, { type HomeHeroSlide } from "@/domains/publico/components/HomeHeroSection";
import { fetchPublicProducts } from "@/domains/productos/services/products";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import type { Product } from "@/types";
import { countProductsForCategory, productMatchesAnySearch } from "@/utils/catalog";
import { buildCatalogHref, buildCyberCatalogHref } from "@/routes/catalogRouting";
import heroHombreBotin from "@/assets/home/hero-hombre-botin-ai.png";
import heroFormal from "@/assets/home/hero-formal-ai.png";
import cyberWowCampaign from "@/assets/home/cyber-wow-campaign-ai.png";
import cyberWowCampaignMobile from "@/assets/home/cyber-wow-campaign-mobile-ai.png";
import cyberEscolarVertical from "@/assets/home/cyber-escolar-vertical-ai.png";
import cyberZapatillasVertical from "@/assets/home/cyber-zapatillas-vertical-ai.png";
import heroMujer from "@/assets/home/hero-mujer-ai.png";
import heroNinos from "@/assets/home/hero-ninos-ai.png";
import heroOfertas from "@/assets/home/hero-ofertas-ai.png";
import heroZapatillas from "@/assets/home/hero-zapatillas-ai.png";
import categoryChildrenEditorial from "@/assets/home/categories/category-children-editorial.png";
import categoryMenEditorial from "@/assets/home/categories/category-men-editorial.png";
import categorySneakersEditorial from "@/assets/home/categories/category-sneakers-editorial.png";
import categoryWomenEditorial from "@/assets/home/categories/category-women-editorial.png";

type HomeCategoryCard = {
  label: string;
  slug: string;
  href: string;
  image: string;
  copy: string;
  caption: string;
  area: "men" | "women" | "zapatillas" | "children";
  match: { type: "category"; value: string } | { type: "search"; terms: string[] };
};

const HOME_CATEGORY_CARDS: HomeCategoryCard[] = [
  {
    label: "Hombre",
    slug: "hombre",
    href: buildCatalogHref({ categoria: "hombre" }),
    image: categoryMenEditorial,
    copy: "Botines, casuales y urbanos",
    caption: "Presencia segura para cada paso",
    area: "men",
    match: { type: "category", value: "hombre" },
  },
  {
    label: "Mujer",
    slug: "mujer",
    href: buildCatalogHref({ categoria: "mujer" }),
    image: categoryWomenEditorial,
    copy: "Modelos cómodos con presencia",
    caption: "Estilo que acompaña tu ritmo",
    area: "women",
    match: { type: "category", value: "mujer" },
  },
  {
    label: "Niños",
    slug: "nino",
    href: buildCatalogHref({ categoria: "nino" }),
    image: categoryChildrenEditorial,
    copy: "Resistentes para el día a día",
    caption: "Calidad para crecer jugando",
    area: "children",
    match: { type: "category", value: "nino" },
  },
  {
    label: "Zapatillas",
    slug: "zapatillas",
    href: buildCatalogHref({ tipo: "zapatillas" }),
    image: categorySneakersEditorial,
    copy: "Urbanas, deportivas y casuales",
    caption: "Comodidad lista para moverse",
    area: "zapatillas",
    match: { type: "search", terms: ["zapatillas"] },
  },
];

function computeHomeCategoryCounts(products: Product[]) {
  return HOME_CATEGORY_CARDS.reduce<Record<string, number>>((acc, category) => {
    const match = category.match;
    acc[category.slug] =
      match.type === "category"
        ? countProductsForCategory(products, match.value)
        : products.filter((product) => productMatchesAnySearch(product, match.terms)).length;
    return acc;
  }, {});
}

const HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    id: "mujer",
    image: heroMujer,
    alt: "Botines de dama en tono neutro para looks urbanos.",
    kicker: "Colección mujer",
    title: "Botines para caminar con estilo.",
    subtitle: "Diseños cómodos, versátiles y listos para acompañarte en cada salida.",
    primaryLink: buildCatalogHref({ categoria: "mujer" }),
    primaryText: "Ver mujer",
    secondaryLink: buildCatalogHref({ categoria: "mujer", tipo: "botines" }),
    secondaryText: "Botines",
    badges: ["Elegancia diaria", "Paso ligero", "Looks urbanos"],
    spotlightTitle: "Diseños pensados para el ritmo diario de la mujer moderna.",
    spotlightCopy: "Una selección para moverte con confianza, combinar fácil y mantener presencia sin esfuerzo.",
  },
  {
    id: "hombre-botin",
    image: heroHombreBotin,
    alt: "Botines negros de hombre con estilo urbano.",
    kicker: "Botín hombre",
    title: "Botines con carácter urbano.",
    subtitle: "Diseños resistentes para caminar seguro, combinar fácil y mantener presencia todos los días.",
    primaryLink: buildCatalogHref({ categoria: "hombre" }),
    primaryText: "Ver hombre",
    secondaryLink: buildCatalogHref({ categoria: "hombre", tipo: "botines" }),
    secondaryText: "Botines",
    badges: ["Textura premium", "Base firme", "Perfil sobrio"],
    spotlightTitle: "Un par serio para ciudad, oficina y salidas de noche.",
    spotlightCopy: "Construcción resistente, silueta adaptable y presencia que no necesita explicación desde la primera mirada.",
  },
  {
    id: "ninos",
    image: heroNinos,
    alt: "Selección de calzado infantil del catálogo.",
    kicker: "Infantil",
    title: "Resistencia para jugar, caminar y volver.",
    subtitle: "Tallas claras y modelos prácticos para acompañar cada día con comodidad.",
    primaryLink: buildCatalogHref({ categoria: "nino" }),
    primaryText: "Ver niños",
    secondaryLink: buildCatalogHref({ categoria: "nino", tipo: "escolar" }),
    secondaryText: "Escolar",
    badges: ["Más juego", "Ajuste práctico", "Uso diario"],
    spotlightTitle: "Pares listos para clases, recreo y salidas de toda la semana.",
    spotlightCopy: "Modelos fáciles de elegir con mejor lectura de tallas, resistencia comprobada y uso real.",
  },
  {
    id: "zapatillas",
    image: heroZapatillas,
    alt: "Zapatillas urbanas y deportivas destacadas en el catálogo.",
    kicker: "Zapatillas",
    title: "Movimiento con comodidad desde el primer paso.",
    subtitle: "Encuentra zapatillas urbanas, deportivas y casuales para renovar tu rotación.",
    primaryLink: buildCatalogHref({ tipo: "zapatillas" }),
    primaryText: "Ver zapatillas",
    secondaryLink: buildCatalogHref({ tipo: "zapatillas", estilo: "deportivas" }),
    secondaryText: "Deportivas",
    badges: ["Ciudad activa", "Comodidad real", "Cambio de ritmo"],
    spotlightTitle: "La sección más dinámica del catálogo para renovar tu rotación.",
    spotlightCopy: "Zapatillas urbanas, deportivas y casuales con tallas visibles y precios claros en un solo lugar.",
  },
  {
    id: "formal",
    image: heroFormal,
    alt: "Calzado formal pensado para oficina y eventos.",
    kicker: "Calzado formal",
    title: "Presencia para oficina y eventos.",
    subtitle: "Pares pensados para verse bien sin perder comodidad durante el día.",
    primaryLink: buildCatalogHref({ tipo: "formal" }),
    primaryText: "Ver formales",
    secondaryLink: buildCatalogHref({ categoria: "hombre", tipo: "formal" }),
    secondaryText: "Hombre formal",
    badges: ["Línea limpia", "Impacto sobrio", "Comodidad extendida"],
    spotlightTitle: "Pares para la oficina, reuniones y eventos con presencia limpia.",
    spotlightCopy: "Calzado formal pensado para quien quiere verse bien y estar cómodo de principio a fin del día.",
  },
  {
    id: "ofertas",
    image: heroOfertas,
    alt: "Selección destacada del catálogo con descuentos activos.",
    kicker: "Selección destacada",
    title: "Descuentos activos en calzado seleccionado.",
    subtitle: "Pares con precio rebajado, tallas visibles y stock actualizado para decidir sin dudas.",
    primaryLink: buildCyberCatalogHref({}),
    primaryText: "Ver Cyber Wow",
    secondaryLink: "/favoritos",
    secondaryText: "Favoritos",
    badges: ["Precios claros", "Tallas visibles", "Stock real"],
    spotlightTitle: "Descuentos activos con stock real y tallas visibles antes de comprar.",
    spotlightCopy: "Pares seleccionados con precio claro, stock actualizado y comparación directa en un solo vistazo.",
  },
];


const HOME_CYBER_VERTICAL_CAMPAIGNS = [
  {
    title: "LO MEJOR EN ZAPATILLAS",
    image: cyberZapatillasVertical,
    alt: "Campaña vertical de zapatillas deportivas.",
    to: buildCyberCatalogHref({ linea: "zapatillas", campana: "cyber" }),
    cta: "Ver zapatillas Cyber",
  },
  {
    title: "LO MEJOR EN ZAPATO ESCOLAR",
    image: cyberEscolarVertical,
    alt: "Campaña vertical de calzado escolar para niñas.",
    to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", tipo: "escolar" }),
    cta: "Ver escolar Cyber",
  },
] as const;

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const [spotlightPage, setSpotlightPage] = useState(0);
  const categoriesGridRef = useRef<HTMLDivElement | null>(null);

  const loadProducts = useCallback(() => {
    fetchPublicProducts()
      .then(setProducts)
      .catch(() => setError("No pudimos cargar los productos destacados."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useProductsRealtime(loadProducts);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const grid = categoriesGridRef.current;
    if (!grid || prefersReducedMotion) {
      setCategoriesVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCategoriesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const productCount = products.length;
  const productCountLabel = error ? "--" : productCount ? String(productCount) : "Nuevo";
  const featuredProducts = useMemo(() => {
    const inStock = products.filter((product) => product.stock > 0);
    const selected = inStock.filter((product) => product.destacado);
    return selected.length > 0 ? selected : inStock;
  }, [products]);

  const spotlightPages = useMemo(() => {
    const pages: (typeof featuredProducts)[] = [];
    for (let i = 0; i < featuredProducts.length; i += 4) {
      pages.push(featuredProducts.slice(i, i + 4));
    }
    return pages;
  }, [featuredProducts]);

  const spotlightTotalPages = spotlightPages.length;
  const effectiveSpotlightPage = Math.min(spotlightPage, Math.max(spotlightTotalPages - 1, 0));
  const categoryCounts = useMemo(() => computeHomeCategoryCounts(products), [products]);

  return (
    <main className="home-page">
      <HomeHeroSection slides={HOME_HERO_SLIDES} productCountLabel={productCountLabel} />

      <section className="home-strip">
        <div className="home-strip-inner">
          <div><Truck size={18} /> Envío a domicilio</div>
          <div><Shield size={18} /> Pago 100% seguro</div>
          <div><PackageCheck size={18} /> Stock en tiempo real</div>
          <div><BadgeCheck size={18} /> Asesoría por WhatsApp</div>
        </div>
      </section>

      <section className="home-cyber-section">
        <div className="home-cyber-banner">
          <picture className="home-cyber-banner-media">
            <source media="(max-width: 520px)" srcSet={cyberWowCampaignMobile} />
            <img
              src={cyberWowCampaign}
              alt="Campaña Cyber Wow con calzado premium"
              className="home-cyber-banner-image"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
          <div className="home-cyber-banner-glow" aria-hidden="true" />
          <div className="home-cyber-banner-content">
            <h2 className="home-cyber-title">CYBER WOW</h2>

            <div className="home-cyber-button-row">
              <Link to={buildCyberCatalogHref({ categoria: "hombre", campana: "cyber" })} className="home-cyber-cta home-cyber-cta-dark">
                Cyber Hombre
              </Link>
              <Link to={buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" })} className="home-cyber-cta home-cyber-cta-light">
                Cyber Mujer
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-cyber-vertical-section">
        <div className="home-cyber-vertical-grid">
          {HOME_CYBER_VERTICAL_CAMPAIGNS.map((campaign) => (
            <article key={campaign.title} className="home-cyber-vertical-card">
              <img
                src={campaign.image}
                alt={campaign.alt}
                className="home-cyber-vertical-image"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
              <div className="home-cyber-vertical-copy">
                <h3 className="home-cyber-vertical-title">{campaign.title}</h3>
                <Link to={campaign.to} className="home-cyber-vertical-cta">
                  {campaign.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-spotlight-section">
        <div className="home-spotlight-shell">
          <div className="home-spotlight-topbar">
            <div>
              <span className="section-eyebrow">Más destacados</span>
              <h2 className="section-title">Lo más fuerte del catálogo, sin rodeos.</h2>
            </div>
            <Link to={buildCatalogHref({ promocion: "destacados" })} className="section-link">
              Ver destacados <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="products-skeleton-grid home-spotlight-grid">
              {[...Array(4)].map((_, index) => <div key={index} className="skeleton-card" />)}
            </div>
          ) : featuredProducts.length > 0 ? (
            spotlightTotalPages > 1 ? (
              <div className="home-spotlight-carousel">
                <div
                  className="home-spotlight-track"
                  style={{ transform: `translateX(-${effectiveSpotlightPage * 100}%)` }}
                >
                  {spotlightPages.map((page, pi) => (
                    <div key={pi} className="home-spotlight-page products-grid home-spotlight-grid">
                      {page.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                  ))}
                </div>
                <div className="home-spotlight-nav">
                  <button
                    type="button"
                    className="home-spotlight-nav-btn"
                    onClick={() => setSpotlightPage((p) => Math.max(0, p - 1))}
                    disabled={effectiveSpotlightPage === 0}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="home-spotlight-dots">
                    {spotlightPages.map((_, pi) => (
                      <button
                        key={pi}
                        type="button"
                        className={`home-spotlight-dot${pi === effectiveSpotlightPage ? " is-active" : ""}`}
                        onClick={() => setSpotlightPage(pi)}
                        aria-label={`Página ${pi + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="home-spotlight-nav-btn"
                    onClick={() => setSpotlightPage((p) => Math.min(spotlightTotalPages - 1, p + 1))}
                    disabled={effectiveSpotlightPage === spotlightTotalPages - 1}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="products-grid home-spotlight-grid">
                {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            )
          ) : (
            <div className="home-empty-catalog">
              <p>{error ?? "Estamos preparando una nueva selección de productos destacados para mostrar aquí."}</p>
              <Link to={buildCatalogHref({})} className="btn-primary">
                Ver catálogo
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section home-categories-section">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">Explora por uso</span>
            <h2 className="section-title">Encuentra tu siguiente par</h2>
          </div>
          <Link to={buildCatalogHref({})} className="section-link">
            Catálogo completo <ArrowRight size={14} />
          </Link>
        </div>

        <div
          ref={categoriesGridRef}
          className={`home-categories-grid${categoriesVisible ? " is-visible" : ""}`}
        >
          {HOME_CATEGORY_CARDS.map((category, index) => {
            const count = categoryCounts[category.slug] ?? 0;
            const fromDir = index === 0 || index === 3 ? "left" : "right";

            return (
              <Link
                key={category.slug}
                to={category.href}
                className={`home-category-card home-category-card-${category.area}`}
                data-from={fromDir}
              >
                <img
                  src={category.image}
                  alt={category.label}
                  className="home-category-image"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
                <span className="home-category-shade" aria-hidden="true" />
                <div className="home-category-content">
                  <span className="home-category-order">0{index + 1}</span>
                  <span className="home-category-label">{category.label}</span>
                  <span className="home-category-caption">{category.caption}</span>
                  <span className="home-category-copy">{category.copy}</span>
                  <span className="home-category-count">
                    {count > 0 ? `${count} modelo${count === 1 ? "" : "s"}` : "Explorar"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

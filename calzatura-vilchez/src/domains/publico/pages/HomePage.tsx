import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
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

type HomeHeroSlide = {
  id: string;
  image: string;
  alt: string;
  kicker: string;
  title: string;
  subtitle: string;
  primaryLink: string;
  primaryText: string;
  secondaryLink: string;
  secondaryText: string;
  badges: string[];
  spotlightTitle: string;
  spotlightCopy: string;
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

const HERO_ROTATION_MS = 10000;
const HERO_SWIPE_THRESHOLD = 56;

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isHeroInteractionPaused, setIsHeroInteractionPaused] = useState(false);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [heroDragOffset, setHeroDragOffset] = useState(0);
  const [heroParallax, setHeroParallax] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const heroCarouselRef = useRef<HTMLDivElement | null>(null);
  const heroDragStartXRef = useRef<number | null>(null);
  const heroDragStartYRef = useRef<number | null>(null);
  const heroSwipeSuppressClickRef = useRef(false);
  const [categoriesVisible, setCategoriesVisible] = useState(false);
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

  const heroSlides = HOME_HERO_SLIDES;
  const activeHero = heroSlides[activeHeroIndex] ?? heroSlides[0];
  const canAutoRotateHero = !prefersReducedMotion && heroSlides.length > 1;
  const isHeroAutoRotationActive = canAutoRotateHero && !isHeroInteractionPaused;
  const heroDragDirection = heroDragOffset > 0 ? "right" : heroDragOffset < 0 ? "left" : "idle";

  const shiftHeroSlide = (direction: 1 | -1) => {
    if (heroSlides.length < 2) return;
    setActiveHeroIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
  };

  useEffect(() => {
    if (!isHeroAutoRotationActive) return undefined;

    const timer = window.setTimeout(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, HERO_ROTATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeHeroIndex, heroSlides.length, isHeroAutoRotationActive]);

  const updateHeroDrag = (clientX: number, clientY: number) => {
    const startX = heroDragStartXRef.current;
    const startY = heroDragStartYRef.current;
    if (startX === null || startY === null) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setIsHeroDragging(true);
    setHeroDragOffset(deltaX);
  };

  const beginHeroSwipe = (clientX: number, clientY: number) => {
    if (heroSlides.length < 2) return;
    heroDragStartXRef.current = clientX;
    heroDragStartYRef.current = clientY;
    heroSwipeSuppressClickRef.current = false;
    setIsHeroInteractionPaused(true);
  };

  const finishHeroSwipe = (clientX: number, clientY: number) => {
    const startX = heroDragStartXRef.current;
    const startY = heroDragStartYRef.current;
    const deltaX = startX === null ? 0 : clientX - startX;
    const deltaY = startY === null ? 0 : clientY - startY;

    heroDragStartXRef.current = null;
    heroDragStartYRef.current = null;
    setIsHeroInteractionPaused(false);
    setIsHeroDragging(false);
    setHeroDragOffset(0);

    if (Math.abs(deltaX) < HERO_SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    heroSwipeSuppressClickRef.current = true;
    shiftHeroSlide(deltaX < 0 ? 1 : -1);
  };

  const cancelHeroSwipe = () => {
    heroDragStartXRef.current = null;
    heroDragStartYRef.current = null;
    setIsHeroInteractionPaused(false);
    setIsHeroDragging(false);
    setHeroDragOffset(0);
  };

  const handleHeroTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    beginHeroSwipe(touch.clientX, touch.clientY);
  };

  const handleHeroTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      cancelHeroSwipe();
      return;
    }

    finishHeroSwipe(touch.clientX, touch.clientY);
  };

  const handleHeroTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    updateHeroDrag(touch.clientX, touch.clientY);
    if (heroDragStartXRef.current !== null && heroDragStartYRef.current !== null) {
      const deltaX = touch.clientX - heroDragStartXRef.current;
      const deltaY = touch.clientY - heroDragStartYRef.current;
      if (Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
        event.preventDefault();
      }
    }
  };

  const handleHeroMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    beginHeroSwipe(event.clientX, event.clientY);
  };

  const handleHeroMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (heroDragStartXRef.current !== null) {
      updateHeroDrag(event.clientX, event.clientY);
      return;
    }

    if (prefersReducedMotion) return;
    const container = heroCarouselRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    const nextX = (relativeX - 0.5) * 26;
    const nextY = (relativeY - 0.5) * 22;
    setHeroParallax({ x: nextX, y: nextY });
  };

  const handleHeroMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (heroDragStartXRef.current === null) return;
    finishHeroSwipe(event.clientX, event.clientY);
  };

  const handleHeroMouseLeave = () => {
    if (heroDragStartXRef.current !== null) {
      cancelHeroSwipe();
    }
    setHeroParallax({ x: 0, y: 0 });
  };

  const handleHeroClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!heroSwipeSuppressClickRef.current) return;
    heroSwipeSuppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const getHeroSlideState = (index: number) => {
    if (index === activeHeroIndex) return "active";
    if (index === (activeHeroIndex - 1 + heroSlides.length) % heroSlides.length) return "prev";
    if (index === (activeHeroIndex + 1) % heroSlides.length) return "next";
    return "hidden";
  };

  const [spotlightPage, setSpotlightPage] = useState(0);

  const productCount = products.length;
  const productCountLabel = error ? "--" : productCount || "Nuevo";
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
  const categoryCounts = useMemo(() => {
    return HOME_CATEGORY_CARDS.reduce<Record<string, number>>((acc, category) => {
      const match = category.match;
      acc[category.slug] =
        match.type === "category"
          ? countProductsForCategory(products, match.value)
          : products.filter((product) => productMatchesAnySearch(product, match.terms)).length;
      return acc;
    }, {});
  }, [products]);

  return (
    <main className="home-page">
      <section className="home-hero" aria-roledescription="carousel" aria-label="Promociones destacadas">
        <div
          ref={heroCarouselRef}
          className={`home-hero-carousel ${isHeroDragging ? "is-dragging" : ""}`}
          data-drag-direction={heroDragDirection}
          style={
            {
              "--hero-drag-offset": `${heroDragOffset}px`,
              "--hero-parallax-x": `${heroParallax.x}px`,
              "--hero-parallax-y": `${heroParallax.y}px`,
            } as CSSProperties
          }
          onMouseLeave={handleHeroMouseLeave}
          onMouseDown={handleHeroMouseDown}
          onMouseMove={handleHeroMouseMove}
          onMouseUp={handleHeroMouseUp}
          onTouchStart={handleHeroTouchStart}
          onTouchMove={handleHeroTouchMove}
          onTouchEnd={handleHeroTouchEnd}
          onTouchCancel={cancelHeroSwipe}
          onClickCapture={handleHeroClickCapture}
          onFocus={() => setIsHeroInteractionPaused(true)}
          onBlur={(event) => {
            const nextFocused = event.relatedTarget;
            if (!(nextFocused instanceof Node) || !event.currentTarget.contains(nextFocused)) {
              setIsHeroInteractionPaused(false);
            }
          }}
        >
          {heroSlides.map((slide, index) => (
            <article
              key={slide.id}
              className={`home-hero-slide is-${getHeroSlideState(index)}`}
              data-slide-id={slide.id}
              aria-hidden={index !== activeHeroIndex}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                loading={index === activeHeroIndex ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === activeHeroIndex ? "high" : "low"}
              />
            </article>
          ))}
          <div className="home-hero-shade" />
          <div className="home-hero-grid" />
          <div className="home-hero-orbit home-hero-orbit-a" />
          <div className="home-hero-orbit home-hero-orbit-b" />

          <div className="home-hero-content">
            <div className="home-hero-inner">
              <div key={`copy-${activeHero.id}`} className="home-hero-copy">
                <span className="home-kicker">{activeHero.kicker}</span>
                <h1 className="home-title">{activeHero.title}</h1>
                <p className="home-subtitle">{activeHero.subtitle}</p>

                <div className="home-mood-row">
                  {activeHero.badges.map((badge) => (
                    <span key={`${activeHero.id}-${badge}`} className="home-mood-pill">
                      {badge}
                    </span>
                  ))}
                </div>

                <div className="home-actions">
                  <Link to={activeHero.primaryLink} className="btn-primary btn-lg">
                    {activeHero.primaryText} <ArrowRight size={18} />
                  </Link>
                  <Link to={activeHero.secondaryLink} className="btn-ghost btn-lg">
                    {activeHero.secondaryText}
                  </Link>
                </div>

                <div className="home-proof-row">
                  <div>
                    <strong>{productCountLabel}</strong>
                    <span>modelos en catálogo</span>
                  </div>
                  <div>
                    <strong>24h</strong>
                    <span>atención de pedidos</span>
                  </div>
                  <div>
                    <strong>7d</strong>
                    <span>cambios disponibles</span>
                  </div>
                </div>
              </div>

              <aside className="home-hero-showcase" aria-label="Vitrina destacada">
                <div key={`showcase-${activeHero.id}`} className="home-showcase-shell">
                  <div className="home-showcase-copy-card">
                    <span className="home-showcase-kicker">{activeHero.kicker}</span>
                    <strong className="home-showcase-title">{activeHero.spotlightTitle}</strong>
                    <p className="home-showcase-copy">{activeHero.spotlightCopy}</p>
                  </div>

                  <div className="home-showcase-visual">
                    <img src={activeHero.image} alt={activeHero.alt} loading="eager" decoding="async" fetchPriority="high" />
                    <div className="home-showcase-badge home-showcase-badge-top">
                      <span>Disponible</span>
                      <strong>{productCountLabel} modelos</strong>
                    </div>
                    <div className="home-showcase-badge home-showcase-badge-bottom">
                      <span>Explorar</span>
                      <strong>{activeHero.secondaryText}</strong>
                    </div>
                  </div>


                </div>

              </aside>
            </div>
          </div>
          {/* Flechas de navegación */}
          {/* Barra de progreso del carrusel */}
          <div
            className="home-hero-progress"
            role="progressbar"
            aria-label="Progreso del carrusel"
            aria-valuemin={1}
            aria-valuemax={heroSlides.length}
            aria-valuenow={activeHeroIndex + 1}
            aria-valuetext={`${activeHeroIndex + 1} de ${heroSlides.length}`}
          >
            <span className="home-hero-progress-track">
              <span
                key={`hero-progress-${activeHeroIndex}`}
                className={`home-hero-progress-fill${canAutoRotateHero ? " is-animating" : ""}${isHeroInteractionPaused ? " is-paused" : ""}`}
                style={canAutoRotateHero ? ({ "--hero-progress-duration": `${HERO_ROTATION_MS}ms` } as CSSProperties) : undefined}
              />
            </span>
          </div>
        </div>
      </section>

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

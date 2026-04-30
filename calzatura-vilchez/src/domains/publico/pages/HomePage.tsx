import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  PackageCheck,
  Shield,
  Truck,
} from "lucide-react";
import ProductCard from "@/domains/productos/components/ProductCard";
import { fetchProducts } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import { countProductsForCategory, productMatchesAnySearch } from "@/utils/catalog";
import heroHombreBotin from "@/assets/home/hero-hombre-botin-ai.png";
import heroFormal from "@/assets/home/hero-formal-ai.png";
import cyberWowCampaign from "@/assets/home/cyber-wow-campaign-ai.png";
import cyberWowCampaignMobile from "@/assets/home/cyber-wow-campaign-mobile-ai.png";
import cyberEscolarVertical from "@/assets/home/cyber-escolar-vertical-ai.png";
import cyberZapatillasVertical from "@/assets/home/cyber-zapatillas-vertical-ai.png";
import featuredBoot from "@/assets/home/featured-boot-ai.png";
import featuredLoafer from "@/assets/home/featured-loafer-ai.png";
import featuredRunning from "@/assets/home/featured-running-ai.png";
import featuredSandal from "@/assets/home/featured-sandal-ai.png";
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
    href: "/productos?categoria=hombre",
    image: categoryMenEditorial,
    copy: "Botines, casuales y urbanos",
    caption: "Presencia segura para cada paso",
    area: "men",
    match: { type: "category", value: "hombre" },
  },
  {
    label: "Mujer",
    slug: "mujer",
    href: "/productos?categoria=mujer",
    image: categoryWomenEditorial,
    copy: "Modelos cómodos con presencia",
    caption: "Estilo que acompaña tu ritmo",
    area: "women",
    match: { type: "category", value: "mujer" },
  },
  {
    label: "Niños",
    slug: "nino",
    href: "/productos?categoria=nino",
    image: categoryChildrenEditorial,
    copy: "Resistentes para el día a día",
    caption: "Calidad para crecer jugando",
    area: "children",
    match: { type: "category", value: "nino" },
  },
  {
    label: "Zapatillas",
    slug: "zapatillas",
    href: "/productos?buscar=zapatillas",
    image: categorySneakersEditorial,
    copy: "Urbanas, deportivas y casuales",
    caption: "Comodidad lista para moverse",
    area: "zapatillas",
    match: { type: "search", terms: ["zapatillas", "deportivas", "urbanas"] },
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
    primaryLink: "/productos?categoria=mujer",
    primaryText: "Ver mujer",
    secondaryLink: "/productos?buscar=botines",
    secondaryText: "Botines",
    badges: ["Elegancia diaria", "Paso ligero", "Looks urbanos"],
    spotlightTitle: "Curaduría lista para rotar todo el día.",
    spotlightCopy: "Una selección para moverte con confianza, combinar fácil y mantener presencia sin esfuerzo.",
  },
  {
    id: "hombre-botin",
    image: heroHombreBotin,
    alt: "Botines negros de hombre con estilo urbano.",
    kicker: "Botín hombre",
    title: "Botines con carácter urbano.",
    subtitle: "Diseños resistentes para caminar seguro, combinar fácil y mantener presencia todos los días.",
    primaryLink: "/productos?categoria=hombre",
    primaryText: "Ver hombre",
    secondaryLink: "/productos?categoria=hombre&buscar=botines",
    secondaryText: "Botines",
    badges: ["Textura premium", "Base firme", "Perfil sobrio"],
    spotlightTitle: "Una silueta fuerte para ciudad, oficina y noche.",
    spotlightCopy: "Pensado para quien quiere un par serio, adaptable y con mejor lectura visual desde la primera mirada.",
  },
  {
    id: "ninos",
    image: heroNinos,
    alt: "Selección de calzado infantil del catálogo.",
    kicker: "Infantil",
    title: "Resistencia para jugar, caminar y volver.",
    subtitle: "Tallas claras y modelos prácticos para acompañar cada día con comodidad.",
    primaryLink: "/productos?categoria=nino",
    primaryText: "Ver niños",
    secondaryLink: "/productos?buscar=escolar",
    secondaryText: "Escolar",
    badges: ["Más juego", "Ajuste práctico", "Uso diario"],
    spotlightTitle: "Pares listos para el ritmo real de cada semana.",
    spotlightCopy: "Modelos fáciles de elegir para clases, recreo y salidas, con mejor lectura de tallas y uso.",
  },
  {
    id: "zapatillas",
    image: heroZapatillas,
    alt: "Zapatillas urbanas y deportivas destacadas en el catálogo.",
    kicker: "Zapatillas",
    title: "Movimiento con comodidad desde el primer paso.",
    subtitle: "Encuentra zapatillas urbanas, deportivas y casuales para renovar tu rotación.",
    primaryLink: "/productos?buscar=zapatillas",
    primaryText: "Ver zapatillas",
    secondaryLink: "/productos?buscar=deportivas",
    secondaryText: "Deportivas",
    badges: ["Ciudad activa", "Comodidad real", "Cambio de ritmo"],
    spotlightTitle: "La vitrina más dinámica de la colección.",
    spotlightCopy: "Una entrada más fresca para quien quiere renovar su rotación con pares fáciles de usar y combinar.",
  },
  {
    id: "formal",
    image: heroFormal,
    alt: "Calzado formal pensado para oficina y eventos.",
    kicker: "Calzado formal",
    title: "Presencia para oficina y eventos.",
    subtitle: "Pares pensados para verse bien sin perder comodidad durante el día.",
    primaryLink: "/productos?buscar=formal",
    primaryText: "Ver formales",
    secondaryLink: "/productos?buscar=vestir",
    secondaryText: "De vestir",
    badges: ["Línea limpia", "Impacto sobrio", "Comodidad extendida"],
    spotlightTitle: "Un bloque visual más fino para vender mejor el par formal.",
    spotlightCopy: "Ideal para quien busca elegancia sin ruido, con una entrada más seria, limpia y fácil de convertir.",
  },
  {
    id: "ofertas",
    image: heroOfertas,
    alt: "Selección destacada del catálogo para comparar y elegir mejor.",
    kicker: "Selección destacada",
    title: "Modelos para comprar mejor.",
    subtitle: "Explora pares destacados, compara tallas y guarda tus favoritos antes de decidir.",
    primaryLink: "/productos?buscar=oferta",
    primaryText: "Ver ofertas",
    secondaryLink: "/favoritos",
    secondaryText: "Favoritos",
    badges: ["Selección activa", "Compra rápida", "Mejor decisión"],
    spotlightTitle: "Un frente más aspiracional para activar clics desde el inicio.",
    spotlightCopy: "El objetivo es que la portada no solo informe: debe crear deseo y dirigir la mirada hacia compra inmediata.",
  },
];

const HOME_SHOWCASE_LINKS = [
  { label: "Nuevos ingresos", to: "/productos?buscar=nuevo" },
  { label: "Más vendidos", to: "/productos?buscar=destacado" },
  { label: "Compra por talla", to: "/productos" },
];

const HOME_CYBER_VERTICAL_CAMPAIGNS = [
  {
    title: "LO MEJOR EN ZAPATILLAS",
    image: cyberZapatillasVertical,
    alt: "Campaña vertical de zapatillas deportivas.",
    to: "/productos?buscar=zapatillas",
    cta: "Ver zapatillas",
  },
  {
    title: "LO MEJOR EN ZAPATO ESCOLAR",
    image: cyberEscolarVertical,
    alt: "Campaña vertical de calzado escolar para niñas.",
    to: "/productos?categoria=nino&buscar=escolar",
    cta: "Ver escolar",
  },
] as const;

const HOME_FEATURED_EDITORIAL_IMAGES = [
  featuredRunning,
  featuredBoot,
  featuredSandal,
  featuredLoafer,
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

  useEffect(() => {
    let isMounted = true;

    fetchProducts()
      .then((nextProducts) => {
        if (!isMounted) return;
        setProducts(nextProducts);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No pudimos cargar los productos destacados.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

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
    const container = heroCarouselRef.current;
    if (startX === null || startY === null || !container) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    const maxOffset = Math.max(72, container.getBoundingClientRect().width * 0.18);
    const nextOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    setIsHeroDragging(true);
    setHeroDragOffset(nextOffset);
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

  const productCount = products.length;
  const productCountLabel = error ? "--" : productCount || "Nuevo";
  const featuredProducts = useMemo(() => {
    const inStock = products.filter((product) => product.stock > 0);
    const selected = inStock.filter((product) => product.destacado);
    return (selected.length > 0 ? selected : inStock).slice(0, 4);
  }, [products]);
  const featuredDisplayProducts = useMemo(
    () =>
      featuredProducts.map((product, index) => {
        const editorialImage =
          HOME_FEATURED_EDITORIAL_IMAGES[index % HOME_FEATURED_EDITORIAL_IMAGES.length];

        return {
          ...product,
          imagen: editorialImage,
          imagenes: [editorialImage],
        };
      }),
    [featuredProducts],
  );
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
                    <span className="home-showcase-kicker">Curaduría central</span>
                    <strong className="home-showcase-title">{activeHero.spotlightTitle}</strong>
                    <p className="home-showcase-copy">{activeHero.spotlightCopy}</p>
                  </div>

                  <div className="home-showcase-visual">
                    <img src={activeHero.image} alt={activeHero.alt} loading="eager" decoding="async" fetchPriority="high" />
                    <div className="home-showcase-badge home-showcase-badge-top">
                      <span>Compra guiada</span>
                      <strong>Stock visible</strong>
                    </div>
                    <div className="home-showcase-badge home-showcase-badge-bottom">
                      <span>Ruta activa</span>
                      <strong>{activeHero.secondaryText}</strong>
                    </div>
                  </div>

                  <div className="home-showcase-rail">
                    {HOME_SHOWCASE_LINKS.map((item) => (
                      <Link key={item.label} to={item.to} className="home-showcase-link">
                        <span>{item.label}</span>
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                </div>

              </aside>
            </div>
          </div>
          <div className="home-hero-progress" aria-hidden="true">
            <span className="home-hero-progress-track">
              <span
                key={`hero-progress-${activeHero.id}-${activeHeroIndex}`}
                className={`home-hero-progress-fill ${canAutoRotateHero ? "is-animating" : ""} ${
                  isHeroInteractionPaused ? "is-paused" : ""
                }`}
                style={
                  canAutoRotateHero
                    ? ({ "--hero-progress-duration": `${HERO_ROTATION_MS}ms` } as CSSProperties)
                    : undefined
                }
              />
            </span>
          </div>
        </div>
      </section>

      <section className="home-strip">
        <div className="home-strip-inner">
          <div><Truck size={18} /> Envío coordinado</div>
          <div><Shield size={18} /> Compra protegida</div>
          <div><PackageCheck size={18} /> Stock visible</div>
          <div><BadgeCheck size={18} /> Atención personalizada</div>
        </div>
      </section>

      <section className="home-cyber-section">
        <div className="home-cyber-banner">
          <picture className="home-cyber-banner-media">
            <source media="(max-width: 520px)" srcSet={cyberWowCampaignMobile} />
            <img
              src={cyberWowCampaign}
              alt="Campa\u00f1a Cyber Wow con calzado premium"
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
              <Link to="/productos?categoria=hombre&buscar=oferta" className="home-cyber-cta home-cyber-cta-dark">
                Cyber Hombre
              </Link>
              <Link to="/productos?categoria=mujer&buscar=oferta" className="home-cyber-cta home-cyber-cta-light">
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
            <Link to="/productos?buscar=destacado" className="section-link">
              Ver destacados <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="products-skeleton-grid home-spotlight-grid">
              {[...Array(4)].map((_, index) => <div key={index} className="skeleton-card" />)}
            </div>
          ) : featuredDisplayProducts.length > 0 ? (
            <div className="products-grid home-spotlight-grid">
              {featuredDisplayProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="home-empty-catalog">
              <p>{error ?? "Estamos preparando una nueva selección de productos destacados para mostrar aquí."}</p>
              <Link to="/productos" className="btn-primary">
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
          <Link to="/productos" className="section-link">
            Catalogo completo <ArrowRight size={14} />
          </Link>
        </div>

        <div className="home-categories-grid">
          {HOME_CATEGORY_CARDS.map((category, index) => {
            const count = categoryCounts[category.slug] ?? 0;

            return (
              <Link
                key={category.slug}
                to={category.href}
                className={`home-category-card home-category-card-${category.area}`}
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

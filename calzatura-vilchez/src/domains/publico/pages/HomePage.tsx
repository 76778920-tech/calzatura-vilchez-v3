import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Footprints,
  PackageCheck,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { fetchProducts } from "@/domains/productos/services/products";
import type { Product } from "@/types";
import ProductCard from "@/domains/productos/components/ProductCard";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import heroImage from "@/assets/hero.png";
import heroHombreBotin from "@/assets/home/hero-hombre-botin.jpg";
import heroMujer from "@/assets/home/hero-mujer.jpg";

const CATEGORIES = [
  { label: "Hombre", slug: "hombre", icon: Footprints, copy: "Botines, casuales y urbanos" },
  { label: "Mujer", slug: "mujer", icon: Sparkles, copy: "Modelos cómodos con presencia" },
  { label: "Niños", slug: "nino", icon: Star, copy: "Resistentes para el día a día" },
  { label: "Formal", slug: "formal", icon: BriefcaseBusiness, copy: "Pares para oficina y eventos" },
];

type HomeHeroSlide = {
  id: string;
  image: string;
  kicker: string;
  title: string;
  subtitle: string;
  primaryLink: string;
  primaryText: string;
  secondaryLink: string;
  secondaryText: string;
};

const HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    id: "mujer",
    image: heroMujer,
    kicker: "Colección mujer",
    title: "Botines para caminar con estilo.",
    subtitle: "Diseños cómodos, versátiles y listos para acompañarte en cada salida.",
    primaryLink: "/productos?categoria=mujer",
    primaryText: "Ver mujer",
    secondaryLink: "/productos?buscar=botines",
    secondaryText: "Botines",
  },
  {
    id: "hombre-botin",
    image: heroHombreBotin,
    kicker: "Botín hombre",
    title: "Botines con carácter urbano.",
    subtitle: "Diseños resistentes para caminar seguro, combinar fácil y mantener presencia todos los días.",
    primaryLink: "/productos?categoria=hombre",
    primaryText: "Ver hombre",
    secondaryLink: "/productos?categoria=hombre&buscar=botines",
    secondaryText: "Botines",
  },
  {
    id: "ninos",
    image: heroImage,
    kicker: "Infantil",
    title: "Resistencia para jugar, caminar y volver.",
    subtitle: "Tallas claras y modelos prácticos para acompañar cada día con comodidad.",
    primaryLink: "/productos?categoria=nino",
    primaryText: "Ver niños",
    secondaryLink: "/productos?buscar=escolar",
    secondaryText: "Escolar",
  },
  {
    id: "zapatillas",
    image: heroImage,
    kicker: "Zapatillas",
    title: "Movimiento con comodidad desde el primer paso.",
    subtitle: "Encuentra zapatillas urbanas, deportivas y casuales para renovar tu rotación.",
    primaryLink: "/productos?buscar=zapatillas",
    primaryText: "Ver zapatillas",
    secondaryLink: "/productos?buscar=deportivas",
    secondaryText: "Deportivas",
  },
  {
    id: "formal",
    image: heroImage,
    kicker: "Calzado formal",
    title: "Presencia para oficina y eventos.",
    subtitle: "Pares pensados para verse bien sin perder comodidad durante el día.",
    primaryLink: "/productos?categoria=formal",
    primaryText: "Ver formales",
    secondaryLink: "/productos?buscar=vestir",
    secondaryText: "De vestir",
  },
  {
    id: "ofertas",
    image: heroImage,
    kicker: "Selección destacada",
    title: "Modelos para comprar mejor.",
    subtitle: "Explora pares destacados, compara tallas y guarda tus favoritos antes de decidir.",
    primaryLink: "/productos?buscar=oferta",
    primaryText: "Ver ofertas",
    secondaryLink: "/favoritos",
    secondaryText: "Favoritos",
  },
];

export default function HomePage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);
    const selected = inStock.filter((p) => p.destacado);
    return (selected.length > 0 ? selected : inStock).slice(0, 4);
  }, [products]);

  const heroSlides = HOME_HERO_SLIDES;
  const activeHero = heroSlides[activeHeroIndex] ?? heroSlides[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const productCount = products.length;
  const categoryCounts = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, product) => {
      acc[product.categoria] = (acc[product.categoria] ?? 0) + 1;
      return acc;
    }, {});
  }, [products]);

  return (
    <main className="home-page">
      <section className="home-hero" aria-roledescription="carousel" aria-label="Promociones destacadas">
        <div className="home-hero-carousel">
          {heroSlides.map((slide, index) => (
            <article
              key={slide.id}
              className={`home-hero-slide ${index === activeHeroIndex ? "active" : ""}`}
              data-slide-id={slide.id}
              aria-hidden={index !== activeHeroIndex}
            >
              <img src={slide.image} alt="" />
            </article>
          ))}
          <div className="home-hero-shade" />

          <div className="home-hero-content">
            <div className="home-hero-copy">
              <span className="home-kicker">{activeHero.kicker}</span>
              <h1 className="home-title">{activeHero.title}</h1>
              <p className="home-subtitle">{activeHero.subtitle}</p>
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
                  <strong>{productCount || "Nuevo"}</strong>
                  <span>modelos en catálogo</span>
                </div>
                <div>
                  <strong>24h</strong>
                  <span>atención de pedidos</span>
                </div>
                <div>
                  <strong>PE</strong>
                  <span>precios en soles</span>
                </div>
              </div>
            </div>

            <div className="home-hero-controls" aria-label="Cambiar banner">
              <button
                type="button"
                onClick={() => setActiveHeroIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)}
                aria-label="Imagen anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="home-hero-dots">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`dot-${slide.id}`}
                    type="button"
                    className={index === activeHeroIndex ? "active" : ""}
                    onClick={() => setActiveHeroIndex(index)}
                    aria-label={`Ver banner ${index + 1}`}
                    aria-current={index === activeHeroIndex}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveHeroIndex((current) => (current + 1) % heroSlides.length)}
                aria-label="Imagen siguiente"
              >
                <ChevronRight size={20} />
              </button>
            </div>
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

      <section className="section home-categories-section">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">Explora por uso</span>
            <h2 className="section-title">Encuentra tu siguiente par</h2>
          </div>
          <Link to="/productos" className="section-link">
            Catálogo completo <ArrowRight size={14} />
          </Link>
        </div>

        <div className="home-categories-grid">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const count = categoryCounts[category.slug] ?? 0;
            return (
              <Link key={category.slug} to={`/productos?categoria=${category.slug}`} className="home-category-card">
                <span className="home-category-icon"><Icon size={24} /></span>
                <span className="home-category-label">{category.label}</span>
                <span className="home-category-copy">{category.copy}</span>
                <span className="home-category-count">
                  {count > 0 ? `${count} modelo${count === 1 ? "" : "s"}` : "Ver categoría"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-editorial">
        <div className="home-editorial-inner">
          <div className="home-editorial-copy">
            <span className="section-eyebrow">Selección destacada</span>
            <h2>Modelos listos para salir, trabajar y volver cómodo.</h2>
            <p>
              Priorizamos tallas claras, stock actualizado y fotos directas para que la decisión
              sea simple antes de agregar al carrito.
            </p>
          </div>
          <Link to="/productos?categoria=casual" className="home-editorial-link">
            Ver casuales <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section-alt">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Favoritos del catálogo</span>
              <h2 className="section-title">Productos destacados</h2>
            </div>
            <Link to="/productos" className="section-link">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="products-skeleton-grid">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : featured.length > 0 ? (
            <div className="products-grid">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="home-empty-catalog">
              <ShoppingBag size={28} />
              <p>
                {isAdmin
                  ? "Aún no hay productos publicados. Agrega modelos desde el panel admin para que aparezcan aquí."
                  : "Estamos preparando nuevos modelos para el catálogo. Vuelve pronto para ver la selección disponible."}
              </p>
              {isAdmin && <Link to="/admin/productos" className="btn-primary">Crear productos</Link>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

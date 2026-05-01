import { useState, useRef, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  Package,
  LayoutDashboard,
  ChevronDown,
  Search,
  MapPin,
  Phone,
  Heart,
  Box,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { useCart } from "@/domains/carrito/context/CartContext";
import { logoutUser } from "@/domains/usuarios/services/auth";
import { fetchProducts } from "@/domains/productos/services/products";
import { useThemeMode } from "@/hooks/useThemeMode";
import { ADMIN_ROUTES, CLIENT_ROUTES, INFO_ROUTES, PUBLIC_ROUTES } from "@/routes/paths";
import {
  buildCatalogHref,
  buildCyberCatalogHref,
  catalogRouteParamsFromPathname,
  CATALOG_SHELF,
  getCatalogUrlKey,
  isProductCatalogPath,
  mergeCatalogSearchParams,
} from "@/routes/catalogRouting";
import type { Product } from "@/types";
import CartSidebar from "@/domains/carrito/components/CartSidebar";
import BrandLogo from "@/components/brand/BrandLogo";
import type { BrandLogoVariant } from "@/components/brand/BrandLogo";
import trendNuevaTemporada from "@/assets/home/trends/trend-nueva-temporada-ai.png";
import trendPasosRadiantes from "@/assets/home/trends/trend-pasos-radiantes-ai.png";
import trendUrbanGlow from "@/assets/home/trends/trend-urban-glow-ai.png";
import trendSunsetChic from "@/assets/home/trends/trend-sunset-chic-ai.png";
import cyberHombreEditorial from "@/assets/home/cyber/cyber-hombre-editorial.png";
import cyberMujerEditorial from "@/assets/home/cyber/cyber-mujer-editorial.png";
import cyberInfantilEditorial from "@/assets/home/cyber/cyber-infantil-editorial.png";
import cyberZapatillasEditorial from "@/assets/home/cyber/cyber-zapatillas-editorial.png";
import toast from "react-hot-toast";

const WHATSAPP_CONTACT_URL =
  "https://wa.me/51964052530?text=Hola%20Calzatura%20Vilchez%2C%20quiero%20hacer%20una%20consulta%20sobre%20sus%20calzados.";

function normalizeRouteToken(value: string | null | undefined) {
  return decodeURIComponent(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " ")
    .trim();
}

function slugifyRouteValue(value: string) {
  return normalizeRouteToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildProductsRoute(params: Record<string, string | undefined>) {
  return buildCatalogHref(params);
}

function buildBrandRoute(brand: string) {
  return buildProductsRoute({ vista: "marcas", marcaSlug: slugifyRouteValue(brand) });
}

const HEADER_LOGO_VARIANT: BrandLogoVariant = "premium";

type MegaLink = {
  label: string;
  to: string;
  tag?: string;
  accent?: boolean;
  image?: string;
  hoverPanel?: {
    eyebrow: string;
    items: MegaLink[];
    layout?: "grid" | "list";
  };
};
type MegaMenu = {
  id: string;
  label: string;
  columns: { title?: string; links: MegaLink[] }[];
  featured?: MegaLink[];
  chips?: { title: string; items: MegaLink[] };
  promo?: { eyebrow: string; title: string; subtitle: string; to?: string };
};

type MobileMenuMode = "click" | "hover" | null;

const megaMenus: MegaMenu[] = [
  {
    id: "cyber",
    label: "CYBER WOW",
    featured: [
      {
        label: "Cyber Hombre",
        to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber" }),
        accent: true,
        hoverPanel: {
          eyebrow: "CYBER HOMBRE",
          layout: "list",
          items: [
            {
              label: "Zapatillas Cyber",
              to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber", tipo: "zapatillas" }),
              image: cyberHombreEditorial,
            },
            {
              label: "Zapatos Cyber",
              to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber", tipo: "zapatos" }),
              image: cyberHombreEditorial,
            },
            {
              label: "Botines Cyber",
              to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber", tipo: "botines" }),
              image: cyberHombreEditorial,
            },
            { label: "Ver Todo", to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber" }), image: cyberHombreEditorial },
          ],
        },
      },
      {
        label: "Cyber Mujer",
        to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" }),
        hoverPanel: {
          eyebrow: "CYBER MUJER",
          layout: "list",
          items: [
            {
              label: "Zapatillas Cyber",
              to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber", tipo: "zapatillas" }),
              image: cyberMujerEditorial,
            },
            {
              label: "Sandalias Cyber",
              to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber", tipo: "sandalias" }),
              image: cyberMujerEditorial,
            },
            {
              label: "Botines Cyber",
              to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber", tipo: "botines" }),
              image: cyberMujerEditorial,
            },
            { label: "Ver Todo", to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" }), image: cyberMujerEditorial },
          ],
        },
      },
      {
        label: "Cyber Infantil",
        to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", segmento: "infantil" }),
        hoverPanel: {
          eyebrow: "CYBER INFANTIL",
          layout: "list",
          items: [
            {
              label: "Escolar Cyber",
              to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", tipo: "escolar" }),
              image: cyberInfantilEditorial,
            },
            {
              label: "Juvenil Activo",
              to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", segmento: "juvenil" }),
              image: cyberInfantilEditorial,
            },
            {
              label: "Zapatillas Cyber",
              to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", tipo: "zapatillas" }),
              image: cyberInfantilEditorial,
            },
            { label: "Ver Todo", to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber" }), image: cyberInfantilEditorial },
          ],
        },
      },
      {
        label: "Cyber Zapatillas",
        to: buildCyberCatalogHref({ linea: "zapatillas", campana: "cyber" }),
        hoverPanel: {
          eyebrow: "CYBER ZAPATILLAS",
          layout: "list",
          items: [
            { label: "Mujer", to: buildCyberCatalogHref({ categoria: "mujer", tipo: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
            { label: "Hombre", to: buildCyberCatalogHref({ categoria: "hombre", tipo: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
            { label: "Niños", to: buildCyberCatalogHref({ categoria: "nino", tipo: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
            { label: "Ver Todo", to: buildCyberCatalogHref({ linea: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
          ],
        },
      },
    ],
    columns: [],
  },
  {
    id: "mujer",
    label: "Mujer",
      featured: [
      {
        label: "Nuevas Tendencias",
        to: buildProductsRoute({ categoria: "mujer", campana: "nueva-temporada" }),
        hoverPanel: {
          eyebrow: "NEW & TRENDING",
          items: [
            {
              label: "Nueva Temporada",
              to: buildProductsRoute({ categoria: "mujer", campana: "nueva-temporada" }),
              image: trendNuevaTemporada,
            },
            {
              label: "Pasos Radiantes",
              to: buildProductsRoute({ categoria: "mujer", coleccion: "pasos-radiantes" }),
              image: trendPasosRadiantes,
            },
            {
              label: "Urban Glow",
              to: buildProductsRoute({ categoria: "mujer", coleccion: "urban-glow" }),
              image: trendUrbanGlow,
            },
            {
              label: "Sunset Chic",
              to: buildProductsRoute({ categoria: "mujer", coleccion: "sunset-chic" }),
              image: trendSunsetChic,
            },
          ],
        },
      },
      { label: "Calzado Mujer", to: buildProductsRoute({ categoria: "mujer" }), accent: true },
      { label: "Marcas", to: buildProductsRoute({ vista: "marcas" }) },
    ],
    columns: [
      {
        title: "CALZADO MUJER",
        links: [
          { label: "Zapatillas", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas" }) },
          { label: "Sandalias", to: buildProductsRoute({ categoria: "mujer", tipo: "sandalias" }) },
          { label: "Zapatos Casuales", to: buildProductsRoute({ categoria: "mujer", tipo: "casual" }) },
          { label: "Zapatos de Vestir", to: buildProductsRoute({ categoria: "mujer", tipo: "formal" }) },
          { label: "Mocasines", to: buildProductsRoute({ categoria: "mujer", tipo: "mocasines" }) },
          { label: "Botas y Botines", to: buildProductsRoute({ categoria: "mujer", tipo: "botas" }) },
          { label: "Ballerinas", to: buildProductsRoute({ categoria: "mujer", tipo: "ballerinas" }) },
          { label: "Pantuflas", to: buildProductsRoute({ categoria: "mujer", tipo: "pantuflas" }) },
          { label: "Flip Flops", to: buildProductsRoute({ categoria: "mujer", tipo: "flip-flops" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "mujer" }) },
        ],
      },
    ],
    promo: {
      eyebrow: "NEW ARRIVALS",
      title: "Essential Summer",
      subtitle: "Mujer",
      to: buildProductsRoute({ categoria: "mujer" }),
    },
  },
  {
    id: "hombre",
    label: "Hombre",
    featured: [
      {
        label: "Nuevas Tendencias",
        to: buildProductsRoute({ categoria: "hombre", campana: "nueva-temporada" }),
        hoverPanel: {
          eyebrow: "NEW & TRENDING",
          items: [
            { label: "Nueva Temporada", to: buildProductsRoute({ categoria: "hombre", campana: "nueva-temporada" }) },
            { label: "Ruta Urbana", to: buildProductsRoute({ categoria: "hombre", coleccion: "ruta-urbana" }) },
            { label: "Paso Ejecutivo", to: buildProductsRoute({ categoria: "hombre", coleccion: "paso-ejecutivo" }) },
            { label: "Weekend Flow", to: buildProductsRoute({ categoria: "hombre", coleccion: "weekend-flow" }) },
          ],
        },
      },
      {
        label: "Calzado Hombre",
        to: buildProductsRoute({ categoria: "hombre" }),
        accent: true,
      },
      {
        label: "Marcas",
        to: buildProductsRoute({ vista: "marcas" }),
        hoverPanel: {
          eyebrow: "MARCAS",
          items: [
            { label: "Calzatura Vilchez", to: buildBrandRoute("Calzatura Vilchez") },
            { label: "Bata", to: buildBrandRoute("Bata") },
            { label: "Clarks", to: buildBrandRoute("Clarks") },
            { label: "Adidas", to: buildBrandRoute("Adidas") },
          ],
        },
      },
    ],
    columns: [
      {
        title: "CALZADO HOMBRE",
        links: [
          { label: "Zapatillas", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas" }) },
          { label: "Zapatos de Vestir", to: buildProductsRoute({ categoria: "hombre", tipo: "formal" }) },
          { label: "Zapatos Casuales", to: buildProductsRoute({ categoria: "hombre", tipo: "casual" }) },
          { label: "Sandalias", to: buildProductsRoute({ categoria: "hombre", tipo: "sandalias" }) },
          { label: "Botines", to: buildProductsRoute({ categoria: "hombre", tipo: "botines" }) },
          { label: "Zapatos de Seguridad", to: buildProductsRoute({ categoria: "hombre", tipo: "seguridad" }) },
          { label: "Pantuflas", to: buildProductsRoute({ categoria: "hombre", tipo: "pantuflas" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "hombre" }) },
        ],
      },
    ],
    promo: {
      eyebrow: "NUEVA COLECCIÓN",
      title: "Urban Classics",
      subtitle: "Hombre",
      to: buildProductsRoute({ categoria: "hombre" }),
    },
  },
  {
    id: "infantil",
    label: "Infantil",
    featured: [
      {
        label: "Nuevas Tendencias",
        to: buildProductsRoute({ categoria: "nino", campana: "nueva-temporada" }),
        hoverPanel: {
          eyebrow: "NEW & TRENDING",
          items: [
            { label: "Nueva Temporada", to: buildProductsRoute({ categoria: "nino", campana: "nueva-temporada" }) },
            { label: "Vuelta al Cole", to: buildProductsRoute({ categoria: "nino", coleccion: "vuelta-al-cole" }) },
            { label: "Paso Activo", to: buildProductsRoute({ categoria: "nino", tipo: "zapatillas" }) },
            { label: "Mini Aventuras", to: buildProductsRoute({ categoria: "nino", coleccion: "mini-aventuras" }) },
          ],
        },
      },
      {
        label: "Niños",
        to: buildProductsRoute({ categoria: "nino", segmento: "ninos" }),
        accent: true,
        hoverPanel: {
          eyebrow: "NIÑOS",
          layout: "list",
          items: [
            { label: "Infantil 1-3 Años", to: buildProductsRoute({ categoria: "nino", rangoEdad: "1-3" }) },
            { label: "Niños 4-6 años", to: buildProductsRoute({ categoria: "nino", segmento: "ninos" }) },
            { label: "Junior 7-10 Años", to: buildProductsRoute({ categoria: "nino", segmento: "junior" }) },
            { label: "Accesorios", to: buildProductsRoute({ categoria: "nino", tipo: "accesorios" }) },
            { label: "Zapatos", to: buildProductsRoute({ categoria: "nino", tipo: "zapatos" }) },
            { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino" }) },
          ],
        },
      },
      {
        label: "Niñas",
        to: buildProductsRoute({ categoria: "nino", segmento: "ninas" }),
        hoverPanel: {
          eyebrow: "NIÑAS",
          layout: "list",
          items: [
            { label: "Escolar", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "escolar" }) },
            { label: "Zapatillas", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "zapatillas" }) },
            { label: "Ballerinas", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "ballerinas" }) },
            { label: "Botas y Botines", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "botas" }) },
            { label: "Sandalias", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "sandalias" }) },
            { label: "Zapatos", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "zapatos" }) },
            { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino", segmento: "ninas" }) },
          ],
        },
      },
      {
        label: "Marcas",
        to: buildProductsRoute({ vista: "marcas" }),
        hoverPanel: {
          eyebrow: "MARCAS",
          items: [
            { label: "Calzatura Vilchez", to: buildBrandRoute("Calzatura Vilchez") },
            { label: "Bata", to: buildBrandRoute("Bata") },
            { label: "Platanitos", to: buildBrandRoute("Platanitos") },
            { label: "Adidas", to: buildBrandRoute("Adidas") },
          ],
        },
      },
    ],
    columns: [
      {
        title: "CALZADO NIÑO",
        links: [
          { label: "Escolar", to: buildProductsRoute({ categoria: "nino", tipo: "escolar" }) },
          { label: "Sandalias", to: buildProductsRoute({ categoria: "nino", tipo: "sandalias" }) },
          { label: "Zapatillas", to: buildProductsRoute({ categoria: "nino", tipo: "zapatillas" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino" }) },
        ],
      },
      {
        title: "NIÑO",
        links: [
          { label: "Infantil 1-3 Años", to: buildProductsRoute({ categoria: "nino", rangoEdad: "1-3" }) },
          { label: "Niños 4-6 años", to: buildProductsRoute({ categoria: "nino", segmento: "ninos" }) },
          { label: "Junior 7-10 Años", to: buildProductsRoute({ categoria: "nino", segmento: "junior" }) },
          { label: "Accesorios", to: buildProductsRoute({ categoria: "nino", tipo: "accesorios" }) },
          { label: "Zapatos", to: buildProductsRoute({ categoria: "nino", tipo: "zapatos" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino" }) },
        ],
      },
    ],
    promo: {
      eyebrow: "KIDS",
      title: "Listos para jugar",
      subtitle: "Infantil",
      to: buildProductsRoute({ categoria: "nino" }),
    },
  },
  {
    id: "zapatillas",
    label: "Zapatillas",
    featured: [
      {
        label: "Zapatillas Mujer",
        to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas" }),
        tag: "+ Estilos",
        hoverPanel: {
          eyebrow: "ZAPATILLAS MUJER",
          items: [
            { label: "Urbanas", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas", estilo: "urbanas" }) },
            { label: "Deportivas", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas", estilo: "deportivas" }) },
            { label: "Casuales", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas", estilo: "casuales" }) },
            { label: "Outdoor", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas", estilo: "outdoor" }) },
            { label: "Ver Todo", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas" }) },
          ],
        },
      },
      {
        label: "Zapatillas Hombre",
        to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas" }),
        tag: "+ Estilos",
        hoverPanel: {
          eyebrow: "ZAPATILLAS HOMBRE",
          items: [
            { label: "Urbanas", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas", estilo: "urbanas" }) },
            { label: "Deportivas", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas", estilo: "deportivas" }) },
            { label: "Casuales", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas", estilo: "casuales" }) },
            { label: "Outdoor", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas", estilo: "outdoor" }) },
            { label: "Ver Todo", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas" }) },
          ],
        },
      },
      {
        label: "Zapatillas Blancas",
        to: buildProductsRoute({ linea: "zapatillas", color: "blanco" }),
        tag: "+ Buscadas",
        hoverPanel: {
          eyebrow: "ZAPATILLAS BLANCAS",
          items: [
            { label: "Mujer", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas", color: "blanco" }) },
            { label: "Hombre", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas", color: "blanco" }) },
            { label: "Niños", to: buildProductsRoute({ categoria: "nino", tipo: "zapatillas", color: "blanco" }) },
            { label: "Juvenil", to: buildProductsRoute({ categoria: "nino", segmento: "juvenil", tipo: "zapatillas", color: "blanco" }) },
          ],
        },
      },
    ],
    columns: [],
  },
  {
    id: "marcas",
    label: "Marcas",
    featured: [
      { label: "Calzatura Vilchez", to: buildBrandRoute("Calzatura Vilchez"), accent: true },
      { label: "Nuevas Marcas", to: buildProductsRoute({ vista: "marcas" }) },
      { label: "Más Vendidas", to: buildProductsRoute({ promocion: "destacados" }) },
    ],
    columns: [
      {
        title: "MARCAS",
        links: [
          { label: "Todas las marcas", to: buildProductsRoute({ vista: "marcas" }) },
          { label: "Dama", to: buildProductsRoute({ categoria: "mujer" }) },
          { label: "Hombre", to: buildProductsRoute({ categoria: "hombre" }) },
          { label: "Infantil", to: buildProductsRoute({ categoria: "nino" }) },
          { label: "Ver Todo", to: buildProductsRoute({}) },
        ],
      },
    ],
    promo: {
      eyebrow: "BRANDS",
      title: "Selección premium",
      subtitle: "Marcas",
      to: buildProductsRoute({ vista: "marcas" }),
    },
  },
];

function MegaMenuPanel({
  menu,
  onClose,
  isLinkCurrent,
}: {
  menu: MegaMenu;
  onClose: () => void;
  isLinkCurrent: (to: string) => boolean;
}) {
  const preferredDefaultLabel = useMemo(() => {
    if (menu.id === "zapatillas") return "Zapatillas Hombre";
    if (menu.id === "cyber") return "Cyber Hombre";
    return null;
  }, [menu.id]);

  const defaultFeaturedHoverItem = useMemo(() => {
    if (!preferredDefaultLabel) return null;
    const preferred = (menu.featured ?? []).find((item) => item.label === preferredDefaultLabel);
    return preferred?.hoverPanel?.items[0] ?? null;
  }, [menu.featured, preferredDefaultLabel]);

  const defaultFeaturedHoverPanel = useMemo(() => {
    if (!preferredDefaultLabel) return null;
    return (menu.featured ?? []).find((item) => item.label === preferredDefaultLabel)?.hoverPanel ?? null;
  }, [menu.featured, preferredDefaultLabel]);

  const [activeHoverPanel, setActiveHoverPanel] = useState<MegaLink["hoverPanel"] | null>(() => defaultFeaturedHoverPanel);
  const [activeHoverItem, setActiveHoverItem] = useState<MegaLink | null>(() => defaultFeaturedHoverItem);

  return (
    <div className="mega-menu-panel" onMouseEnter={() => undefined}>
      <button type="button" className="mega-close" onClick={onClose} aria-label="Cerrar menú">
        <X size={26} />
      </button>

      <div className="mega-inner">
        <div className="mega-featured">
          {(menu.featured ?? []).map((item) => (
            <div
              key={`${menu.id}-${item.label}`}
              className={`mega-featured-item ${item.hoverPanel ? "has-hover-panel" : ""}`}
              onMouseEnter={() => {
                setActiveHoverPanel(item.hoverPanel ?? null);
                setActiveHoverItem(item.hoverPanel?.items[0] ?? null);
              }}
              onFocus={() => {
                setActiveHoverPanel(item.hoverPanel ?? null);
                setActiveHoverItem(item.hoverPanel?.items[0] ?? null);
              }}
            >
              <Link
                to={item.to}
                className={`mega-featured-link ${item.accent ? "accent" : ""} ${isLinkCurrent(item.to) ? "is-current" : ""}`}
                onClick={onClose}
                aria-current={isLinkCurrent(item.to) ? "page" : undefined}
              >
                <span>{item.label}</span>
                {item.tag && <small>{item.tag}</small>}
              </Link>
            </div>
          ))}

          <div className="mega-service-links">
            <Link to={PUBLIC_ROUTES.stores} onClick={onClose}><MapPin size={18} /> Tiendas</Link>
            <Link to={INFO_ROUTES.ayudaRastreoPedido} onClick={onClose}><Box size={18} /> Localiza tu pedido</Link>
            <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" onClick={onClose}><Phone size={18} /> Contáctanos</a>
            <hr />
            <Link to={CLIENT_ROUTES.profile} onClick={onClose}><User size={18} /> Mi cuenta</Link>
            <Link to={CLIENT_ROUTES.favorites} onClick={onClose}><Heart size={18} /> Favoritos</Link>
          </div>
        </div>

        <div
          className={`mega-columns ${activeHoverPanel ? "panel-open" : ""}`}
          onMouseEnter={() => {
            if (activeHoverPanel) return;
            if (!defaultFeaturedHoverPanel && !defaultFeaturedHoverItem) return;
            setActiveHoverPanel(defaultFeaturedHoverPanel);
            setActiveHoverItem(defaultFeaturedHoverItem);
          }}
        >
          {activeHoverPanel ? (
            <div className="mega-hover-panel" role="menu" aria-label={activeHoverPanel.eyebrow}>
              <p className="mega-hover-panel-title">{activeHoverPanel.eyebrow}</p>
              <div
                className={`mega-hover-panel-${activeHoverPanel.layout === "list" ? "list" : "grid"}`}
              >
                {activeHoverPanel.items.map((panelItem) => (
                  <Link
                    key={panelItem.label}
                    to={panelItem.to}
                    onClick={onClose}
                    onMouseEnter={() => setActiveHoverItem(panelItem)}
                    onFocus={() => setActiveHoverItem(panelItem)}
                    className={isLinkCurrent(panelItem.to) ? "is-current" : ""}
                    aria-current={isLinkCurrent(panelItem.to) ? "page" : undefined}
                  >
                    {panelItem.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <>
              {menu.columns.map((column) => (
                <div className="mega-column" key={`${menu.id}-${column.title}`}>
                  {column.title && <p className="mega-column-title">{column.title}</p>}
                  {column.links.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={onClose}
                      className={isLinkCurrent(item.to) ? "is-current" : ""}
                      aria-current={isLinkCurrent(item.to) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}

              {menu.chips && (
                <div className="mega-chip-zone">
                  <p className="mega-column-title">{menu.chips.title}</p>
                  <div className="mega-chip-grid">
                    {menu.chips.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={onClose}
                        className={isLinkCurrent(item.to) ? "is-current" : ""}
                        aria-current={isLinkCurrent(item.to) ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {activeHoverItem?.image ? (
          <Link
            to={activeHoverItem.to}
            className="mega-trend-preview"
            onClick={onClose}
          >
            <img
              src={activeHoverItem.image}
              alt={activeHoverItem.label}
              className="mega-trend-preview-image"
            />
            <div className="mega-trend-preview-copy">
              <span>{activeHoverPanel?.eyebrow ?? "NEW & TRENDING"}</span>
              <strong>{activeHoverItem.label}</strong>
            </div>
          </Link>
        ) : menu.promo && (
          <Link
            to={menu.promo.to ?? PUBLIC_ROUTES.products}
            className={`mega-promo ${isLinkCurrent(menu.promo.to ?? PUBLIC_ROUTES.products) ? "is-current" : ""}`}
            onClick={onClose}
            aria-current={isLinkCurrent(menu.promo.to ?? PUBLIC_ROUTES.products) ? "page" : undefined}
          >
            <span>{menu.promo.eyebrow}</span>
            <strong>{menu.promo.title}</strong>
            <small>{menu.promo.subtitle}</small>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Header() {
  const { user, userProfile, isAdmin, hasVerifiedAccess, requiresEmailVerification } = useAuth();
  const { itemCount, setIsOpen: setCartOpen } = useCart();
  const { theme, toggleTheme } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeMobileMenuId, setActiveMobileMenuId] = useState<string | null>(null);
  const [mobileMenuMode, setMobileMenuMode] = useState<MobileMenuMode>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const activeMenu = megaMenus.find((menu) => menu.id === activeMenuId) ?? null;
  const mergedCatalogParams = useMemo(
    () => mergeCatalogSearchParams(location.pathname, catalogRouteParamsFromPathname(location.pathname), searchParams),
    [location.pathname, searchParams]
  );

  const currentCategory = normalizeRouteToken(mergedCatalogParams.get("categoria"));
  const currentView = normalizeRouteToken(mergedCatalogParams.get("vista"));
  const currentSearch = normalizeRouteToken(mergedCatalogParams.get("buscar"));
  const currentBrand = normalizeRouteToken(mergedCatalogParams.get("marca"));
  const currentBrandSlug = normalizeRouteToken(mergedCatalogParams.get("marcaSlug"));
  const currentCampaign = normalizeRouteToken(mergedCatalogParams.get("campana"));
  const currentType = normalizeRouteToken(mergedCatalogParams.get("tipo"));
  const currentLine = normalizeRouteToken(mergedCatalogParams.get("linea"));
  const currentColor = normalizeRouteToken(mergedCatalogParams.get("color"));
  const currentPromotion = normalizeRouteToken(mergedCatalogParams.get("promocion"));

  const currentRouteMenuId = useMemo(() => {
    if (!isProductCatalogPath(location.pathname)) return null;
    if (currentView === "marcas" || currentBrand || currentBrandSlug) return "marcas";
    if (
      currentCampaign === "cyber" ||
      currentPromotion === "oferta" ||
      currentPromotion === "destacados" ||
      currentSearch.includes("cyber") ||
      currentSearch.includes("oferta") ||
      currentSearch.includes("destacado")
    ) {
      return "cyber";
    }
    if (
      currentLine === "zapatillas" ||
      currentType === "zapatillas" ||
      (currentColor === "blanco" &&
        (currentLine === "zapatillas" || currentType === "zapatillas" || currentSearch.includes("zapatillas"))) ||
      currentSearch.includes("zapatillas")
    ) {
      return "zapatillas";
    }
    if (currentCategory === "mujer") return "mujer";
    if (currentCategory === "hombre") return "hombre";
    if (currentCategory === "nino") return "infantil";
    return null;
  }, [
    currentBrand,
    currentBrandSlug,
    currentCampaign,
    currentCategory,
    currentColor,
    currentLine,
    currentPromotion,
    currentSearch,
    currentType,
    currentView,
    location.pathname,
  ]);

  const isLinkCurrent = useMemo(() => {
    return (to: string) => {
      const target = new URL(to, "https://calzatura.local");
      if (isProductCatalogPath(target.pathname) || isProductCatalogPath(location.pathname)) {
        return getCatalogUrlKey(location.pathname, location.search) === getCatalogUrlKey(target.pathname, target.search);
      }
      if (target.pathname !== location.pathname) return false;

      const targetParams = new URLSearchParams(target.search);
      const entries = Array.from(targetParams.entries());

      if (entries.length === 0) {
        return true;
      }

      return entries.every(([key, value]) => {
        const expected = normalizeRouteToken(value);
        const current = normalizeRouteToken(searchParams.get(key));
        if (!current) return false;
        if (key === "buscar" || key === "marca") return current.includes(expected);
        return current === expected;
      });
    };
  }, [location.pathname, location.search, searchParams]);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHeaderSearch(searchParams.get("buscar") ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const closeMegaMenu = () => setActiveMenuId(null);

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setActiveMobileMenuId(null);
    setMobileMenuMode(null);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    closeMobileMenu();
    closeMegaMenu();
    try {
      await logoutUser();
      navigate(PUBLIC_ROUTES.home);
      toast.success("Sesión cerrada");
    } catch {
      toast.error("Error al cerrar sesión");
    }
  };

  const displayName = userProfile?.nombre?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Usuario";
  const avatarLetter = (userProfile?.nombre?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();
  const searchSuggestions = useMemo(() => {
    const query = headerSearch.trim().toLowerCase();
    if (query.length < 2) return [];

    return products
      .filter((product) => {
        const searchable = [
          product.nombre,
          product.descripcion,
          product.marca,
          product.tipoCalzado,
          product.color,
          product.categoria,
          ...(product.colores ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 5);
  }, [headerSearch, products]);

  const handleHeaderSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = headerSearch.trim();
    closeMegaMenu();
    if (!query) {
      navigate(CATALOG_SHELF.products);
      return;
    }
    navigate(buildCatalogHref({ buscar: query }));
  };

  const selectSuggestion = (product: Product) => {
    setHeaderSearch(product.nombre);
    setSearchFocused(false);
    closeMegaMenu();
    navigate(`/producto/${product.id}`);
  };

  const handleThemeToggle = () => {
    closeMegaMenu();
    toggleTheme();
  };

  return (
    <>
      <header className="header" onMouseLeave={closeMegaMenu}>
        <div className="header-inner">
          <button
            className="mobile-menu-btn"
            onClick={() => {
              closeMegaMenu();
              setMobileOpen((current) => {
                setActiveMobileMenuId(null);
                if (current && mobileMenuMode === "hover") {
                  setMobileMenuMode("click");
                  return true;
                }
                setMobileMenuMode(current ? null : "click");
                return !current;
              });
            }}
            onMouseEnter={() => {
              if (mobileMenuMode === "click") return;
              closeMegaMenu();
              setActiveMobileMenuId(null);
              setMobileMenuMode((current) => current ?? "hover");
              setMobileOpen(true);
            }}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav className="nav-desktop" aria-label="Secciones principales">
            {megaMenus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                className={`nav-link mega-nav-trigger ${activeMenuId === menu.id ? "active" : ""} ${
                  currentRouteMenuId === menu.id ? "route-current" : ""
                }`}
                onMouseEnter={() => setActiveMenuId(menu.id)}
                onFocus={() => setActiveMenuId(menu.id)}
                onClick={() => setActiveMenuId((current) => current === menu.id ? null : menu.id)}
                aria-expanded={activeMenuId === menu.id}
                aria-current={currentRouteMenuId === menu.id ? "page" : undefined}
              >
                {menu.label}
                {menu.id === "cyber" && <span className="mega-fire" aria-hidden="true">🔥</span>}
              </button>
            ))}
          </nav>

          <Link to="/" className="logo" onClick={closeMegaMenu}>
            <BrandLogo
              className="brand-logo brand-logo--header"
              variant={HEADER_LOGO_VARIANT}
              mode={theme === "dark" ? "dark" : "light"}
              layout="horizontal"
            />
          </Link>

          <form className="header-search" onSubmit={handleHeaderSearch}>
            <Search size={16} className="header-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                closeMegaMenu();
              }}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              placeholder="Buscar"
              aria-label="Buscar productos"
            />
            {searchFocused && searchSuggestions.length > 0 && (
              <div className="header-search-results" role="listbox">
                {searchSuggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="header-search-result"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(product)}
                  >
                    <span>{product.nombre}</span>
                    <small>{product.marca || product.categoria}</small>
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={handleThemeToggle}
              aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="cart-btn"
              onClick={() => {
                closeMegaMenu();
                setCartOpen(true);
              }}
              aria-label="Abrir carrito"
            >
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
              )}
            </button>

            {user ? (
              <div className="user-menu-wrapper" ref={userMenuRef}>
                <button
                  className="user-btn"
                  onClick={() => {
                    closeMegaMenu();
                    setUserMenuOpen((v) => !v);
                  }}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                >
                  <div className="user-avatar">{avatarLetter}</div>
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown" role="menu">
                    <div className="user-dropdown-header">
                      <p className="user-dropdown-name">{userProfile?.nombre ?? displayName}</p>
                      <p className="user-dropdown-email">{user.email}</p>
                      {isAdmin && <span className="badge-admin">Admin</span>}
                    </div>
                    <div className="user-dropdown-items">
                      {isAdmin && (
                        <Link to={ADMIN_ROUTES.dashboard} className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
                          <LayoutDashboard size={16} />
                          Panel Admin
                        </Link>
                      )}
                      {hasVerifiedAccess ? (
                        <>
                          <Link to={CLIENT_ROUTES.orderHistory} className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
                            <Package size={16} />
                            Mis Pedidos
                          </Link>
                          <Link to={CLIENT_ROUTES.profile} className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
                            <User size={16} />
                            Mi Perfil
                          </Link>
                        </>
                      ) : requiresEmailVerification ? (
                        <Link
                          to={PUBLIC_ROUTES.verifyEmail}
                          className="dropdown-item"
                          onClick={() => setUserMenuOpen(false)}
                          role="menuitem"
                        >
                          <User size={16} />
                          Verificar Correo
                        </Link>
                      ) : null}
                      <hr className="dropdown-divider" />
                      <button onClick={handleLogout} className="dropdown-item dropdown-logout" role="menuitem">
                        <LogOut size={16} />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-btns">
                <Link to={PUBLIC_ROUTES.login} className="btn-login" onClick={closeMegaMenu}>Iniciar Sesión</Link>
                <Link to={PUBLIC_ROUTES.register} className="btn-register" onClick={closeMegaMenu}>Registrarse</Link>
              </div>
            )}

            <button
              className="mobile-menu-btn header-actions-menu-btn"
              onClick={() => {
                closeMegaMenu();
                setMobileOpen((v) => !v);
              }}
              aria-label="Menú"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {activeMenu && <MegaMenuPanel key={activeMenu.id} menu={activeMenu} onClose={closeMegaMenu} isLinkCurrent={isLinkCurrent} />}

        {mobileOpen && (
          <nav
            className="nav-mobile"
            onMouseLeave={() => {
              if (mobileMenuMode === "hover") closeMobileMenu();
            }}
          >
            {megaMenus.map((menu) => (
              <div
                key={menu.id}
                className="nav-mobile-group"
                onMouseEnter={() => setActiveMobileMenuId(menu.id)}
              >
                <button
                  type="button"
                  className={`nav-mobile-link nav-mobile-trigger ${activeMobileMenuId === menu.id ? "active" : ""} ${
                    currentRouteMenuId === menu.id ? "route-current" : ""
                  }`}
                  onClick={() => setActiveMobileMenuId((current) => current === menu.id ? null : menu.id)}
                  onFocus={() => setActiveMobileMenuId(menu.id)}
                  aria-expanded={activeMobileMenuId === menu.id}
                  aria-current={currentRouteMenuId === menu.id ? "page" : undefined}
                >
                  <span>{menu.label}</span>
                  <ChevronDown size={18} className="nav-mobile-chevron" />
                </button>

                {activeMobileMenuId === menu.id && (
                  <div className="nav-mobile-panel">
                    {(menu.featured ?? []).map((item) => (
                      <div key={`${menu.id}-featured-${item.label}`} className="nav-mobile-subgroup">
                        <Link
                          to={item.to}
                          className={`nav-mobile-sublink nav-mobile-sublink--group ${item.accent ? "accent" : ""} ${isLinkCurrent(item.to) ? "is-current" : ""}`}
                          onClick={closeMobileMenu}
                          aria-current={isLinkCurrent(item.to) ? "page" : undefined}
                        >
                          <span>{item.label}</span>
                          {item.tag && <small>{item.tag}</small>}
                        </Link>

                        {item.hoverPanel?.items?.length ? (
                          <div className={`nav-mobile-subchildren nav-mobile-subchildren--${item.hoverPanel.layout === "grid" ? "grid" : "list"}`}>
                            {item.hoverPanel.items.map((panelItem) => (
                              <Link
                                key={`${menu.id}-${item.label}-${panelItem.label}`}
                                to={panelItem.to}
                                className={`nav-mobile-sublink nav-mobile-sublink--child ${isLinkCurrent(panelItem.to) ? "is-current" : ""}`}
                                onClick={closeMobileMenu}
                                aria-current={isLinkCurrent(panelItem.to) ? "page" : undefined}
                              >
                                <span>{panelItem.label}</span>
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {menu.columns.map((column) => (
                      <div key={`${menu.id}-column-${column.title ?? "links"}`} className="nav-mobile-subgroup">
                        {column.title ? <p className="nav-mobile-subtitle">{column.title}</p> : null}
                        <div className="nav-mobile-subchildren nav-mobile-subchildren--list">
                          {column.links.map((item) => (
                            <Link
                              key={`${menu.id}-${column.title}-${item.label}`}
                              to={item.to}
                              className={`nav-mobile-sublink nav-mobile-sublink--child ${isLinkCurrent(item.to) ? "is-current" : ""}`}
                              onClick={closeMobileMenu}
                              aria-current={isLinkCurrent(item.to) ? "page" : undefined}
                            >
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}

                    {menu.chips?.items?.length ? (
                      <div className="nav-mobile-subgroup">
                        {menu.chips.title ? <p className="nav-mobile-subtitle">{menu.chips.title}</p> : null}
                        <div className="nav-mobile-subchildren nav-mobile-subchildren--grid">
                          {menu.chips.items.map((item) => (
                            <Link
                              key={`${menu.id}-chip-${item.label}`}
                              to={item.to}
                              className={`nav-mobile-sublink nav-mobile-sublink--child ${isLinkCurrent(item.to) ? "is-current" : ""}`}
                              onClick={closeMobileMenu}
                              aria-current={isLinkCurrent(item.to) ? "page" : undefined}
                            >
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            <div className="nav-mobile-footer-links">
              <Link to={PUBLIC_ROUTES.stores} className="nav-mobile-link" onClick={closeMobileMenu}><MapPin size={18} /> Tiendas</Link>
              <Link to={INFO_ROUTES.ayudaRastreoPedido} className="nav-mobile-link" onClick={closeMobileMenu}><Box size={18} /> Localiza tu pedido</Link>
              <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" className="nav-mobile-link" onClick={closeMobileMenu}><Phone size={18} /> Contáctanos</a>
              <span className="nav-mobile-divider" aria-hidden="true" />
              <Link
                to={user ? (hasVerifiedAccess ? CLIENT_ROUTES.profile : PUBLIC_ROUTES.verifyEmail) : PUBLIC_ROUTES.login}
                className="nav-mobile-link"
                onClick={closeMobileMenu}
              >
                <User size={18} /> {user && !hasVerifiedAccess ? "Verificar correo" : "Mi cuenta"}
              </Link>
              <Link to={CLIENT_ROUTES.favorites} className="nav-mobile-link" onClick={closeMobileMenu}><Heart size={18} /> Favoritos</Link>
            </div>
            {!user && (
              <>
                <Link to={PUBLIC_ROUTES.login} className="nav-mobile-link" onClick={closeMobileMenu}>Iniciar Sesión</Link>
                <Link to={PUBLIC_ROUTES.register} className="nav-mobile-link" onClick={closeMobileMenu}>Registrarse</Link>
              </>
            )}
          </nav>
        )}
      </header>

      <CartSidebar />
    </>
  );
}

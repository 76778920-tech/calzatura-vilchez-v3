import { useState, useRef, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import type { Product } from "@/types";
import CartSidebar from "@/domains/carrito/components/CartSidebar";
import toast from "react-hot-toast";

const WHATSAPP_CONTACT_URL =
  "https://wa.me/51964052530?text=Hola%20Calzatura%20Vilchez%2C%20quiero%20hacer%20una%20consulta%20sobre%20sus%20calzados.";

function SunflowerIcon({ size = 32 }: { size?: number }) {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="20"
          cy="7.5"
          rx="3"
          ry="6.5"
          fill="#C9A227"
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="7" fill="#3d2008" />
      <circle cx="20" cy="20" r="5.5" fill="#2d1505" />
    </svg>
  );
}

type MegaLink = { label: string; to: string; tag?: string; accent?: boolean };
type MegaMenu = {
  id: string;
  label: string;
  columns: { title?: string; links: MegaLink[] }[];
  featured?: MegaLink[];
  chips?: { title: string; items: MegaLink[] };
  promo?: { eyebrow: string; title: string; subtitle: string };
};

type MobileMenuMode = "click" | "hover" | null;

const megaMenus: MegaMenu[] = [
  {
    id: "cyber",
    label: "CYBER WOW",
    featured: [
      { label: "Nuevas Tendencias", to: "/productos?vista=tendencias" },
      { label: "Calzado Mujer", to: "/productos?categoria=mujer", accent: true },
      { label: "Accesorios", to: "/productos?buscar=accesorios" },
      { label: "Marcas", to: "/productos?vista=marcas" },
      { label: "Menos de S/129.90", to: "/productos?buscar=oferta" },
      { label: "% Cyber", to: "/productos?buscar=cyber", tag: "Hasta 60% Off" },
    ],
    columns: [
      {
        title: "OFERTAS",
        links: [
          { label: "Destacados", to: "/productos?buscar=destacado" },
          { label: "Zapatillas en oferta", to: "/productos?buscar=zapatillas oferta" },
          { label: "Sandalias", to: "/productos?buscar=sandalias" },
          { label: "Ver Todo", to: "/productos" },
        ],
      },
    ],
    promo: { eyebrow: "CYBER WOW", title: "Ofertas destacadas", subtitle: "Calzado seleccionado" },
  },
  {
    id: "mujer",
    label: "Mujer",
    featured: [
      { label: "Nuevas Tendencias", to: "/productos?categoria=mujer" },
      { label: "Calzado Mujer", to: "/productos?categoria=mujer", accent: true },
      { label: "Accesorios", to: "/productos?categoria=mujer&buscar=accesorios" },
      { label: "Marcas", to: "/productos?vista=marcas" },
      { label: "Menos de S/129.90", to: "/productos?categoria=mujer&buscar=oferta" },
    ],
    columns: [
      {
        title: "CALZADO MUJER",
        links: [
          { label: "Zapatillas", to: "/productos?categoria=mujer&buscar=zapatillas" },
          { label: "Sandalias", to: "/productos?categoria=mujer&buscar=sandalias" },
          { label: "Zapatos Casuales", to: "/productos?categoria=mujer&buscar=casual" },
          { label: "Zapatos de Vestir", to: "/productos?categoria=mujer&buscar=formal" },
          { label: "Mocasines", to: "/productos?categoria=mujer&buscar=mocasines" },
          { label: "Botas y Botines", to: "/productos?categoria=mujer&buscar=botas" },
          { label: "Ballerinas", to: "/productos?categoria=mujer&buscar=ballerinas" },
          { label: "Pantuflas", to: "/productos?categoria=mujer&buscar=pantuflas" },
          { label: "Flip Flops", to: "/productos?categoria=mujer&buscar=flip flops" },
          { label: "Ver Todo", to: "/productos?categoria=mujer" },
        ],
      },
    ],
    promo: { eyebrow: "NEW ARRIVALS", title: "Essential Summer", subtitle: "Mujer" },
  },
  {
    id: "hombre",
    label: "Hombre",
    columns: [
      {
        title: "CALZADO HOMBRE",
        links: [
          { label: "Zapatillas", to: "/productos?categoria=hombre&buscar=zapatillas" },
          { label: "Zapatos de Vestir", to: "/productos?categoria=hombre&buscar=formal" },
          { label: "Zapatos Casuales", to: "/productos?categoria=hombre&buscar=casual" },
          { label: "Sandalias", to: "/productos?categoria=hombre&buscar=sandalias" },
          { label: "Botines", to: "/productos?categoria=hombre&buscar=botines" },
          { label: "Zapatos de Seguridad", to: "/productos?categoria=hombre&buscar=seguridad" },
          { label: "Pantuflas", to: "/productos?categoria=hombre&buscar=pantuflas" },
          { label: "Ver Todo", to: "/productos?categoria=hombre" },
        ],
      },
    ],
    promo: { eyebrow: "NUEVA COLECCIÓN", title: "Urban Classics", subtitle: "Hombre" },
  },
  {
    id: "infantil",
    label: "Infantil",
    columns: [
      {
        title: "CALZADO NIÑO",
        links: [
          { label: "Escolar", to: "/productos?categoria=nino&buscar=escolar" },
          { label: "Sandalias", to: "/productos?categoria=nino&buscar=sandalias" },
          { label: "Zapatillas", to: "/productos?categoria=nino&buscar=zapatillas" },
          { label: "Ver Todo", to: "/productos?categoria=nino" },
        ],
      },
      {
        title: "NIÑO",
        links: [
          { label: "Infantil 1-3 Años", to: "/productos?categoria=nino&buscar=infantil" },
          { label: "Niños 4-6 años", to: "/productos?categoria=nino&buscar=ninos" },
          { label: "Junior 7-10 Años", to: "/productos?categoria=nino&buscar=junior" },
          { label: "Accesorios", to: "/productos?categoria=nino&buscar=accesorios" },
          { label: "Zapatos", to: "/productos?categoria=nino&buscar=zapatos" },
          { label: "Ver Todo", to: "/productos?categoria=nino" },
        ],
      },
    ],
    promo: { eyebrow: "KIDS", title: "Listos para jugar", subtitle: "Infantil" },
  },
  {
    id: "zapatillas",
    label: "Zapatillas",
    featured: [
      { label: "Zapatillas Mujer", to: "/productos?categoria=mujer&buscar=zapatillas", tag: "+ Estilos" },
      { label: "Zapatillas Hombre", to: "/productos?categoria=hombre&buscar=zapatillas", tag: "+ Estilos" },
      { label: "Zapatillas Blancas", to: "/productos?buscar=zapatillas blancas", tag: "+ Buscadas" },
    ],
    columns: [],
    chips: {
      title: "+ ZAPATILLAS",
      items: [
        { label: "Urbanas", to: "/productos?buscar=zapatillas urbanas" },
        { label: "Deportivas", to: "/productos?categoria=deportivo&buscar=zapatillas" },
        { label: "Casuales", to: "/productos?categoria=casual&buscar=zapatillas" },
        { label: "Outdoor", to: "/productos?buscar=outdoor" },
      ],
    },
  },
  {
    id: "marcas",
    label: "Marcas",
    featured: [
      { label: "Calzatura Vilchez", to: "/productos?vista=marcas&marca=Calzatura%20Vilchez", accent: true },
      { label: "Nuevas Marcas", to: "/productos?vista=marcas" },
      { label: "Más Vendidas", to: "/productos?buscar=destacado" },
    ],
    columns: [
      {
        title: "MARCAS",
        links: [
          { label: "Todas las marcas", to: "/productos?vista=marcas" },
          { label: "Dama", to: "/productos?categoria=mujer" },
          { label: "Hombre", to: "/productos?categoria=hombre" },
          { label: "Infantil", to: "/productos?categoria=nino" },
          { label: "Ver Todo", to: "/productos" },
        ],
      },
    ],
    promo: { eyebrow: "BRANDS", title: "Selección premium", subtitle: "Marcas" },
  },
];

function MegaMenuPanel({
  menu,
  onClose,
}: {
  menu: MegaMenu;
  onClose: () => void;
}) {
  return (
    <div className="mega-menu-panel" onMouseEnter={() => undefined}>
      <button type="button" className="mega-close" onClick={onClose} aria-label="Cerrar menú">
        <X size={26} />
      </button>

      <div className="mega-inner">
        <div className="mega-featured">
          {(menu.featured ?? []).map((item) => (
            <Link
              key={`${menu.id}-${item.label}`}
              to={item.to}
              className={`mega-featured-link ${item.accent ? "accent" : ""}`}
              onClick={onClose}
            >
              <span>{item.label}</span>
              {item.tag && <small>{item.tag}</small>}
            </Link>
          ))}

          <div className="mega-service-links">
            <Link to="/tiendas" onClick={onClose}><MapPin size={18} /> Tiendas</Link>
            <Link to="/mis-pedidos" onClick={onClose}><Box size={18} /> Localiza tu pedido</Link>
            <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" onClick={onClose}><Phone size={18} /> Contáctanos</a>
            <hr />
            <Link to="/perfil" onClick={onClose}><User size={18} /> Mi cuenta</Link>
            <Link to="/favoritos" onClick={onClose}><Heart size={18} /> Favoritos</Link>
          </div>
        </div>

        <div className="mega-columns">
          {menu.columns.map((column) => (
            <div className="mega-column" key={`${menu.id}-${column.title}`}>
              {column.title && <p className="mega-column-title">{column.title}</p>}
              {column.links.map((item) => (
                <Link key={item.label} to={item.to} onClick={onClose}>
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
                  <Link key={item.label} to={item.to} onClick={onClose}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {menu.promo && (
          <Link to="/productos" className="mega-promo" onClick={onClose}>
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
  const { user, userProfile, isAdmin } = useAuth();
  const { itemCount, setIsOpen: setCartOpen } = useCart();
  const { theme, toggleTheme } = useThemeMode();
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
      navigate("/");
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
      navigate("/productos");
      return;
    }
    navigate(`/productos?buscar=${encodeURIComponent(query)}`);
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
                className={`nav-link mega-nav-trigger ${activeMenuId === menu.id ? "active" : ""}`}
                onMouseEnter={() => setActiveMenuId(menu.id)}
                onFocus={() => setActiveMenuId(menu.id)}
                onClick={() => setActiveMenuId((current) => current === menu.id ? null : menu.id)}
                aria-expanded={activeMenuId === menu.id}
              >
                {menu.label}
                {menu.id === "cyber" && <span className="mega-fire" aria-hidden="true">🔥</span>}
              </button>
            ))}
          </nav>

          <Link to="/" className="logo" onClick={closeMegaMenu}>
            <span className="logo-sunflower">
              <SunflowerIcon size={34} />
            </span>
            <span className="logo-text-wrap">
              <span className="logo-name">Calzatura Vilchez</span>
              <span className="logo-sub">Calzado Premium</span>
            </span>
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
                        <Link to="/admin" className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
                          <LayoutDashboard size={16} />
                          Panel Admin
                        </Link>
                      )}
                      <Link to="/mis-pedidos" className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
                        <Package size={16} />
                        Mis Pedidos
                      </Link>
                      <Link to="/perfil" className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
                        <User size={16} />
                        Mi Perfil
                      </Link>
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
                <Link to="/login" className="btn-login" onClick={closeMegaMenu}>Iniciar Sesión</Link>
                <Link to="/registro" className="btn-register" onClick={closeMegaMenu}>Registrarse</Link>
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

        {activeMenu && <MegaMenuPanel menu={activeMenu} onClose={closeMegaMenu} />}

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
                  className={`nav-mobile-link nav-mobile-trigger ${activeMobileMenuId === menu.id ? "active" : ""}`}
                  onClick={() => setActiveMobileMenuId((current) => current === menu.id ? null : menu.id)}
                  onFocus={() => setActiveMobileMenuId(menu.id)}
                  aria-expanded={activeMobileMenuId === menu.id}
                >
                  <span>{menu.label}</span>
                  <ChevronDown size={18} className="nav-mobile-chevron" />
                </button>

                {activeMobileMenuId === menu.id && (
                  <div className="nav-mobile-panel">
                    {[...(menu.featured ?? []), ...menu.columns.flatMap((column) => column.links), ...(menu.chips?.items ?? [])].map((item) => (
                      <Link
                        key={`${menu.id}-${item.label}`}
                        to={item.to}
                        className="nav-mobile-sublink"
                        onClick={closeMobileMenu}
                      >
                        <span>{item.label}</span>
                        {item.tag && <small>{item.tag}</small>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="nav-mobile-footer-links">
              <Link to="/tiendas" className="nav-mobile-link" onClick={closeMobileMenu}><MapPin size={18} /> Tiendas</Link>
              <Link to="/mis-pedidos" className="nav-mobile-link" onClick={closeMobileMenu}><Box size={18} /> Localiza tu pedido</Link>
              <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" className="nav-mobile-link" onClick={closeMobileMenu}><Phone size={18} /> Contactanos</a>
              <span className="nav-mobile-divider" aria-hidden="true" />
              <Link to={user ? "/perfil" : "/login"} className="nav-mobile-link" onClick={closeMobileMenu}><User size={18} /> Mi cuenta</Link>
              <Link to="/favoritos" className="nav-mobile-link" onClick={closeMobileMenu}><Heart size={18} /> Favoritos</Link>
            </div>
            {!user && (
              <>
                <Link to="/login" className="nav-mobile-link" onClick={closeMobileMenu}>Iniciar Sesión</Link>
                <Link to="/registro" className="nav-mobile-link" onClick={closeMobileMenu}>Registrarse</Link>
              </>
            )}
          </nav>
        )}
      </header>

      <CartSidebar />
    </>
  );
}

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  Package,
  LayoutDashboard,
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
import { fetchPublicProducts } from "@/domains/productos/services/products";
import { useThemeMode } from "@/hooks/useThemeMode";
import { ADMIN_ROUTES, CLIENT_ROUTES, INFO_ROUTES, PUBLIC_ROUTES } from "@/routes/paths";
import {
  buildCatalogHref,
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
import toast from "react-hot-toast";
import type { MegaLink, MegaMenu, MobileMenuMode } from "@/components/layout/headerMegaMenuTypes";
import { megaMenus, WHATSAPP_CONTACT_URL } from "@/components/layout/headerMenuData";
import HeaderMobileNav from "@/components/layout/HeaderMobileNav";

function normalizeRouteToken(value: string | null | undefined) {
  return decodeURIComponent(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll("+", " ")
    .trim();
}

function createIsLinkCurrent(pathname: string, search: string, searchParams: URLSearchParams) {
  return (to: string) => {
    const target = new URL(to, "https://calzatura.local");
    if (isProductCatalogPath(target.pathname) || isProductCatalogPath(pathname)) {
      return getCatalogUrlKey(pathname, search) === getCatalogUrlKey(target.pathname, target.search);
    }
    if (target.pathname !== pathname) return false;

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
}

function filterProductsByHeaderSearch(products: Product[], headerSearch: string): Product[] {
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    })
    .slice(0, 5);
}

type CatalogRouteMenuTokens = {
  pathname: string;
  currentView: string;
  currentBrand: string;
  currentBrandSlug: string;
  currentCampaign: string;
  currentPromotion: string;
  currentSearch: string;
  currentType: string;
  currentLine: string;
  currentColor: string;
  currentCategory: string;
};

function resolveCatalogRouteMenuId(tokens: CatalogRouteMenuTokens): string | null {
  if (!isProductCatalogPath(tokens.pathname)) return null;
  if (tokens.currentView === "marcas" || tokens.currentBrand || tokens.currentBrandSlug) {
    return "marcas";
  }
  if (
    tokens.currentCampaign === "cyber" ||
    tokens.currentPromotion === "oferta" ||
    tokens.currentPromotion === "destacados" ||
    tokens.currentSearch.includes("cyber") ||
    tokens.currentSearch.includes("oferta") ||
    tokens.currentSearch.includes("destacado")
  ) {
    return "cyber";
  }
  const zapatillasHint =
    tokens.currentLine === "zapatillas" ||
    tokens.currentType === "zapatillas" ||
    (tokens.currentColor === "blanco" &&
      (tokens.currentLine === "zapatillas" ||
        tokens.currentType === "zapatillas" ||
        tokens.currentSearch.includes("zapatillas"))) ||
    tokens.currentSearch.includes("zapatillas");
  if (zapatillasHint) return "zapatillas";
  if (tokens.currentCategory === "mujer") return "mujer";
  if (tokens.currentCategory === "hombre") return "hombre";
  if (tokens.currentCategory === "nino") return "infantil";
  return null;
}

const HEADER_LOGO_VARIANT: BrandLogoVariant = "premium";

function MegaMenuPanel({
  menu,
  onClose,
  isLinkCurrent,
}: Readonly<{
  menu: MegaMenu;
  onClose: () => void;
  isLinkCurrent: (to: string) => boolean;
}>) {
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
    <div className="mega-menu-panel">
      <button type="button" className="mega-close" onClick={onClose} aria-label="Cerrar menú">
        <X size={26} />
      </button>

      <div className="mega-inner">
        <div className="mega-featured">
          {(menu.featured ?? []).map((item) => (
            <div
              key={`${menu.id}-${item.label}`}
              className={`mega-featured-item ${item.hoverPanel ? "has-hover-panel" : ""}`}
            >
              <Link
                to={item.to}
                className={`mega-featured-link ${item.accent ? "accent" : ""} ${isLinkCurrent(item.to) ? "is-current" : ""}`}
                onClick={onClose}
                aria-current={isLinkCurrent(item.to) ? "page" : undefined}
                onMouseEnter={() => {
                  setActiveHoverPanel(item.hoverPanel ?? null);
                  setActiveHoverItem(item.hoverPanel?.items[0] ?? null);
                }}
                onFocus={() => {
                  setActiveHoverPanel(item.hoverPanel ?? null);
                  setActiveHoverItem(item.hoverPanel?.items[0] ?? null);
                }}
              >
                <span>{item.label}</span>
                {item.tag && <small>{item.tag}</small>}
              </Link>
            </div>
          ))}

          <div className="mega-service-links">
            <Link to={PUBLIC_ROUTES.stores} onClick={onClose}><MapPin size={18} /> Tiendas</Link>
            <Link to={INFO_ROUTES.ayudaRastreoPedido} onClick={onClose}><Box size={18} /> Localiza tu pedido</Link>
            <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noopener noreferrer" onClick={onClose}><Phone size={18} /> Contáctanos</a>
            <hr />
            <Link to={CLIENT_ROUTES.profile} onClick={onClose}><User size={18} /> Mi cuenta</Link>
            <Link to={CLIENT_ROUTES.favorites} onClick={onClose}><Heart size={18} /> Favoritos</Link>
          </div>
        </div>

        <section
          className={`mega-columns ${activeHoverPanel ? "panel-open" : ""}`}
          aria-label="Columnas de navegación del menú"
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
                {activeHoverPanel.items.map((panelItem: MegaLink) => (
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
        </section>

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

  const currentRouteMenuId = useMemo(
    () =>
      resolveCatalogRouteMenuId({
        pathname: location.pathname,
        currentView,
        currentBrand,
        currentBrandSlug,
        currentCampaign,
        currentPromotion,
        currentSearch,
        currentType,
        currentLine,
        currentColor,
        currentCategory,
      }),
    [
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
    ]
  );

  const isLinkCurrent = useMemo(
    () => createIsLinkCurrent(location.pathname, location.search, searchParams),
    [location.pathname, location.search, searchParams]
  );

  useEffect(() => {
    fetchPublicProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setHeaderSearch(searchParams.get("buscar") ?? "");
    }, 0);
    return () => globalThis.clearTimeout(timer);
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
  const searchSuggestions = useMemo(
    () => filterProductsByHeaderSearch(products, headerSearch),
    [headerSearch, products]
  );

  const handleHeaderSearch = (event: { preventDefault: () => void }) => {
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

  let userDropdownPrimarySection: ReactNode = null;
  if (hasVerifiedAccess) {
    userDropdownPrimarySection = (
      <>
        <Link to={CLIENT_ROUTES.orderHistory} className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
          <Package size={16} />
          Mis Pedidos
        </Link>
        <Link to={CLIENT_ROUTES.favorites} className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
          <Heart size={16} />
          Favoritos
        </Link>
        <Link to={CLIENT_ROUTES.profile} className="dropdown-item" onClick={() => setUserMenuOpen(false)} role="menuitem">
          <User size={16} />
          Mi Perfil
        </Link>
      </>
    );
  } else if (requiresEmailVerification) {
    userDropdownPrimarySection = (
      <Link
        to={PUBLIC_ROUTES.verifyEmail}
        className="dropdown-item"
        onClick={() => setUserMenuOpen(false)}
        role="menuitem"
      >
        <User size={16} />
        Verificar Correo
      </Link>
    );
  }

  return (
    <>
      <header className="header">
        <section className="header-leave-dismiss" aria-label="Cabecera" onMouseLeave={closeMegaMenu}>
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
              onBlur={() => globalThis.setTimeout(() => setSearchFocused(false), 120)}
              placeholder="Buscar"
              aria-label="Buscar productos"
            />
            {searchFocused && searchSuggestions.length > 0 && (
              <ul className="header-search-results">
                {searchSuggestions.map((product) => (
                  <li key={product.id} className="header-search-result-li">
                    <button
                      type="button"
                      className="header-search-result"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(product)}
                    >
                      <span>{product.nombre}</span>
                      <small>{product.marca || product.categoria}</small>
                    </button>
                  </li>
                ))}
              </ul>
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
                      {userDropdownPrimarySection}
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

        <HeaderMobileNav
          menus={megaMenus}
          open={mobileOpen}
          onMouseLeaveNav={() => {
            if (mobileMenuMode === "hover") closeMobileMenu();
          }}
          activeMobileMenuId={activeMobileMenuId}
          setActiveMobileMenuId={setActiveMobileMenuId}
          currentRouteMenuId={currentRouteMenuId}
          isLinkCurrent={isLinkCurrent}
          onClose={closeMobileMenu}
          user={user}
          hasVerifiedAccess={hasVerifiedAccess}
        />
        </section>
      </header>

      <CartSidebar />
    </>
  );
}

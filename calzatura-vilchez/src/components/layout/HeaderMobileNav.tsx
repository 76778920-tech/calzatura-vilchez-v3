import { Link } from "react-router-dom";
import type { User as AuthUser } from "firebase/auth";
import type { Dispatch, SetStateAction } from "react";
import { Box, Heart, MapPin, Phone, User as UserIcon, ChevronDown } from "lucide-react";
import type { MegaMenu } from "@/components/layout/headerMegaMenuTypes";
import { CLIENT_ROUTES, INFO_ROUTES, PUBLIC_ROUTES } from "@/routes/paths";

const WHATSAPP_CONTACT_URL =
  "https://wa.me/51964052530?text=Hola%20Calzatura%20Vilchez%2C%20quiero%20hacer%20una%20consulta%20sobre%20sus%20calzados.";

type Props = {
  menus: readonly MegaMenu[];
  open: boolean;
  onMouseLeaveNav: () => void;
  activeMobileMenuId: string | null;
  setActiveMobileMenuId: Dispatch<SetStateAction<string | null>>;
  currentRouteMenuId: string | null;
  isLinkCurrent: (to: string) => boolean;
  onClose: () => void;
  user: AuthUser | null;
  hasVerifiedAccess: boolean;
};

export default function HeaderMobileNav({
  menus,
  open,
  onMouseLeaveNav,
  activeMobileMenuId,
  setActiveMobileMenuId,
  currentRouteMenuId,
  isLinkCurrent,
  onClose,
  user,
  hasVerifiedAccess,
}: Props) {
  if (!open) return null;

  let accountHref = PUBLIC_ROUTES.login;
  if (user && hasVerifiedAccess) {
    accountHref = CLIENT_ROUTES.profile;
  } else if (user && !hasVerifiedAccess) {
    accountHref = PUBLIC_ROUTES.verifyEmail;
  }
  const accountLabel = user && !hasVerifiedAccess ? "Verificar correo" : "Mi cuenta";

  return (
    <nav
      className="nav-mobile"
      onMouseLeave={onMouseLeaveNav}
    >
      {menus.map((menu) => (
        <div
          key={menu.id}
          className="nav-mobile-group"
        >
          <button
            type="button"
            className={`nav-mobile-link nav-mobile-trigger ${activeMobileMenuId === menu.id ? "active" : ""} ${
              currentRouteMenuId === menu.id ? "route-current" : ""
            }`}
            onMouseEnter={() => setActiveMobileMenuId(menu.id)}
            onClick={() => setActiveMobileMenuId((current) => (current === menu.id ? null : menu.id))}
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
                    onClick={onClose}
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
                          onClick={onClose}
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
                        onClick={onClose}
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
                        onClick={onClose}
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
        <Link to={PUBLIC_ROUTES.stores} className="nav-mobile-link" onClick={onClose}>
          <MapPin size={18} /> Tiendas
        </Link>
        <Link to={INFO_ROUTES.ayudaRastreoPedido} className="nav-mobile-link" onClick={onClose}>
          <Box size={18} /> Localiza tu pedido
        </Link>
        <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer" className="nav-mobile-link" onClick={onClose}>
          <Phone size={18} /> Contáctanos
        </a>
        <span className="nav-mobile-divider" aria-hidden="true" />
        <Link to={accountHref} className="nav-mobile-link" onClick={onClose}>
          <UserIcon size={18} /> {accountLabel}
        </Link>
        <Link to={CLIENT_ROUTES.favorites} className="nav-mobile-link" onClick={onClose}>
          <Heart size={18} /> Favoritos
        </Link>
      </div>
      {!user && (
        <>
          <Link to={PUBLIC_ROUTES.login} className="nav-mobile-link" onClick={onClose}>
            Iniciar Sesión
          </Link>
          <Link to={PUBLIC_ROUTES.register} className="nav-mobile-link" onClick={onClose}>
            Registrarse
          </Link>
        </>
      )}
    </nav>
  );
}

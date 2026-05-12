import { Link } from "react-router-dom";
import { Clock, Globe, MapPin, Phone } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { INFO_ROUTES } from "@/routes/paths";

const SOCIAL_INSTAGRAM = "https://www.instagram.com/";
const SOCIAL_FACEBOOK = "https://www.facebook.com/";
const SOCIAL_TIKTOK = "https://www.tiktok.com/";

export default function Footer() {
  const whatsappUrl = "https://wa.me/51964052530";
  const mapsUrl = "https://maps.app.goo.gl/RAgi3N12nrffRRTe6";
  const year = new Date().getFullYear();

  const footerColumns = [
    {
      title: "Corporativo",
      description: "Conoce nuestra esencia",
      links: [
        { label: "¿Quiénes somos?", to: INFO_ROUTES.corporativoQuienesSomos },
        { label: "Nuestra historia", to: INFO_ROUTES.corporativoNuestraHistoria },
        { label: "Mundo Vilchez", to: INFO_ROUTES.corporativoMundoVilchez },
        { label: "ISO/IEC 25001 (Tesis)", to: INFO_ROUTES.tesisIso25001 },
      ],
    },
    {
      title: "Términos y condiciones",
      description: "Transparencia y cumplimiento",
      links: [
        { label: "Términos y condiciones", to: INFO_ROUTES.legalTerminos },
        { label: "Política de privacidad", to: INFO_ROUTES.legalPrivacidad },
        { label: "Libro de reclamaciones", to: INFO_ROUTES.legalLibroReclamaciones },
      ],
    },
    {
      title: "Servicio al cliente",
      description: "Te acompañamos en todo momento",
      links: [
        { label: "Contáctanos", to: INFO_ROUTES.ayudaContacto },
        { label: "Localiza tu pedido", to: INFO_ROUTES.ayudaRastreoPedido },
        { label: "Preguntas frecuentes", to: INFO_ROUTES.ayudaPreguntasFrecuentes },
        { label: "Cambios y devoluciones", to: INFO_ROUTES.ayudaCambios },
      ],
    },
    {
      title: "Beneficios",
      description: "Ventajas por comprar en Vilchez",
      links: [
        { label: "Club Vilchez", to: INFO_ROUTES.beneficiosClubVilchez },
        { label: "Cuotas sin intereses", to: INFO_ROUTES.beneficiosCuotas },
      ],
    },
  ] as const;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-club">
            <div className="footer-logo">
              <BrandLogo className="brand-logo brand-logo--footer" variant="premium" mode="dark" layout="horizontal" />
            </div>
            <h3 className="footer-club-title">Club Vilchez te sorprenderá</h3>
            <p className="footer-tagline">Regístrate y accede a beneficios, novedades y ofertas especiales en cada temporada.</p>
            <div className="footer-club-pills" aria-hidden="true">
              <span className="footer-club-pill">Novedades</span>
              <span className="footer-club-pill">Promociones</span>
              <span className="footer-club-pill">Asesoría</span>
            </div>
            <Link to={INFO_ROUTES.beneficiosClubVilchez} className="footer-club-cta">
              Descubre más
            </Link>
            <div className="footer-contact">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="contact-item footer-contact-link"
                aria-label="Abrir WhatsApp de Calzatura Vilchez"
              >
                <Phone size={15} />
                <span>+51 964 052 530</span>
              </a>
              <div className="contact-item">
                <Clock size={15} />
                <span>Lunes a domingo, 9:00 a. m. a 7:30 p. m.</span>
              </div>
            </div>
          </div>

          <div className="footer-columns">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h4 className="footer-heading">{column.title}</h4>
                <p className="footer-column-description">{column.description}</p>
                <div className="footer-links">
                  {column.links.map((link) => (
                    <Link key={link.to} to={link.to} className="footer-link">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="footer-bottom-link"
              aria-label="Abrir ubicación de Calzatura Vilchez en Google Maps"
            >
              <MapPin size={14} />
              Tiendas
            </a>
            <span className="footer-bottom-sep">•</span>
            <span className="footer-bottom-link">
              <Globe size={14} />
              Perú | Español
            </span>
          </div>
          <div className="footer-social">
            <a href={SOCIAL_INSTAGRAM} target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram (sitio oficial)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={SOCIAL_FACEBOOK} target="_blank" rel="noreferrer" className="social-link" aria-label="Facebook (sitio oficial)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href={SOCIAL_TIKTOK} target="_blank" rel="noreferrer" className="social-link" aria-label="TikTok (sitio oficial)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          </div>
          <p>© {year} Calzatura Vilchez · Todos los derechos reservados</p>
        </div>
      </div>
    </footer>
  );
}

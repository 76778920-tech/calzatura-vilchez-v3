import { Link } from "react-router-dom";
import { Clock, MapPin, Phone } from "lucide-react";

function SunflowerIcon({ size = 28 }: { size?: number }) {
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

export default function Footer() {
  const whatsappUrl = "https://wa.me/51964052530";
  const mapsUrl = "https://maps.app.goo.gl/RAgi3N12nrffRRTe6";

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <SunflowerIcon size={30} />
              <span className="footer-brand-name">Calzatura Vilchez</span>
            </div>
            <p className="footer-tagline">
              Calzado de calidad para toda la familia.<br />
              Estilo, comodidad y durabilidad en cada paso.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="#" className="social-link" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="social-link" aria-label="TikTok">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Tienda</h4>
            <div className="footer-links">
              <Link to="/productos?categoria=hombre" className="footer-link">Hombre</Link>
              <Link to="/productos?categoria=mujer" className="footer-link">Mujer</Link>
              <Link to="/productos?categoria=nino" className="footer-link">Niños</Link>
              <Link to="/productos?categoria=deportivo" className="footer-link">Deportivo</Link>
              <Link to="/productos" className="footer-link">Ver Todo</Link>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Mi Cuenta</h4>
            <div className="footer-links">
              <Link to="/login" className="footer-link">Iniciar Sesión</Link>
              <Link to="/registro" className="footer-link">Registrarse</Link>
              <Link to="/mis-pedidos" className="footer-link">Mis Pedidos</Link>
              <Link to="/carrito" className="footer-link">Mi Carrito</Link>
              <Link to="/perfil" className="footer-link">Mi Perfil</Link>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Contacto</h4>
            <div className="footer-contact">
              <div className="contact-item">
                <MapPin size={15} />
                <span>Huancayo, Junín, Perú</span>
              </div>
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
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="footer-visit-banner"
          aria-label="Abrir ubicación de Calzatura Vilchez en Google Maps"
        >
          <MapPin size={18} />
          <span>Visítanos en nuestro local</span>
          <strong>Mercado Modelo, int. N.° 732</strong>
        </a>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Calzatura Vilchez · Todos los derechos reservados</p>
        </div>
      </div>
    </footer>
  );
}

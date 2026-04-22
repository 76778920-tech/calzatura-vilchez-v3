import { MapPin, Clock, Images, Phone } from "lucide-react";

const WHATSAPP_CONTACT_URL =
  "https://wa.me/51964052530?text=Hola%20Calzatura%20Vilchez%2C%20quiero%20visitar%20su%20tienda.%20%C2%BFMe%20comparten%20la%20ubicaci%C3%B3n%3F";
const MAPS_URL = "https://maps.app.goo.gl/RAgi3N12nrffRRTe6";

export default function StoresPage() {
  return (
    <main className="stores-page">
      <section className="stores-hero">
        <span className="page-kicker">Tiendas</span>
        <h1>Visita nuestro puesto</h1>
        <p>
          Pronto agregaremos fotografías reales del puesto para que puedas ubicarlo con facilidad antes de visitarnos.
        </p>
      </section>

      <section className="stores-layout">
        <div className="store-card">
          <div className="store-card-icon"><MapPin size={22} /></div>
          <div>
            <h2>Calzatura Vilchez</h2>
            <p>Mercado Modelo, int. N.° 732</p>
            <a href={MAPS_URL} target="_blank" rel="noreferrer">Abrir ubicación en Google Maps</a>
          </div>
        </div>

        <div className="store-card">
          <div className="store-card-icon"><Clock size={22} /></div>
          <div>
            <h2>Horario de atención</h2>
            <p>Lunes a domingo</p>
            <span>9:00 a. m. a 7:30 p. m.</span>
          </div>
        </div>

        <div className="store-gallery-placeholder">
          <Images size={34} />
          <strong>Fotos del puesto</strong>
          <p>Aquí colocaremos las imágenes de nuestra tienda física.</p>
        </div>
      </section>

      <a className="btn-primary stores-whatsapp" href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer">
        <Phone size={18} />
        Consultar ubicación por WhatsApp
      </a>
    </main>
  );
}

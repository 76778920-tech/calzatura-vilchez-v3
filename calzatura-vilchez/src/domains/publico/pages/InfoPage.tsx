import { Link } from "react-router-dom";
import { INFO_ROUTES } from "@/routes/paths";

type InfoSection = {
  title: string;
  body: string[];
};

type InfoContent = {
  group: "corporativo" | "legal" | "ayuda" | "beneficios";
  kicker: string;
  title: string;
  intro: string;
  accent: string;
  note: string;
  highlights: string[];
  sections: InfoSection[];
  faq?: Array<{ question: string; answer: string }>;
};

const INFO_CONTENT: Record<string, InfoContent> = {
  quienesSomos: {
    group: "corporativo",
    kicker: "Corporativo",
    title: "¿Quiénes somos?",
    intro: "Calzatura Vilchez es una tienda familiar enfocada en calzado cómodo, durable y accesible para cada etapa del día.",
    accent: "Calidad real para uso diario",
    note: "Nuestro objetivo es unir experiencia de tienda física y claridad digital para que comprar sea más simple y seguro.",
    highlights: ["Curaduría por uso real", "Acompañamiento por WhatsApp", "Stock visible y actualizado"],
    sections: [
      {
        title: "Nuestro enfoque",
        body: [
          "Seleccionamos pares con buen calce, materiales confiables y una propuesta clara por uso: diario, oficina, escolar y urbano.",
          "Evitamos catálogos inflados; priorizamos opciones que realmente rotan y resuelven necesidades concretas.",
        ],
      },
      {
        title: "Cómo trabajamos",
        body: [
          "Priorizamos atención personalizada, recomendaciones por talla y soporte postventa para que compres con seguridad.",
          "Cada recomendación parte de contexto real: tipo de uso, frecuencia, superficie y presupuesto.",
        ],
      },
    ],
    faq: [
      { question: "¿Venden solo en Huancayo?", answer: "Atendemos desde Huancayo y coordinamos envíos según cobertura disponible." },
      { question: "¿Puedo pedir recomendación antes de comprar?", answer: "Sí. Te orientamos por WhatsApp con opciones por talla, uso y presupuesto." },
    ],
  },
  nuestraHistoria: {
    group: "corporativo",
    kicker: "Corporativo",
    title: "Nuestra historia",
    intro: "Nacimos desde el comercio local y evolucionamos hacia una vitrina digital para atender mejor a nuestros clientes.",
    accent: "Crecimiento con enfoque práctico",
    note: "La evolución digital no reemplaza la atención humana: la complementa y la vuelve más rápida.",
    highlights: ["Origen local", "Aprendizaje continuo", "Evolución omnicanal"],
    sections: [
      {
        title: "Origen",
        body: [
          "Comenzamos atendiendo en tienda física con curaduría manual de modelos más solicitados.",
          "El conocimiento del cliente nació del trato directo y recomendaciones personalizadas.",
        ],
      },
      {
        title: "Hoy",
        body: [
          "Integramos catálogo en línea y experiencia omnicanal para conectar asesoría, stock y entrega.",
          "El sitio web actúa como una vitrina viva para acelerar la decisión de compra.",
        ],
      },
    ],
  },
  mundoVilchez: {
    group: "corporativo",
    kicker: "Corporativo",
    title: "Calzatura Vilchez en el mundo",
    intro: "Estamos construyendo una presencia digital escalable para llegar a más clientes en Perú.",
    accent: "Escalamos sin perder cercanía",
    note: "La visión es crecer de forma sostenible, conservando servicio humano y procesos claros.",
    highlights: ["Cobertura progresiva", "Modelo escalable", "Marca con identidad propia"],
    sections: [
      {
        title: "Presencia",
        body: [
          "Atendemos desde Huancayo y coordinamos despachos según cobertura disponible.",
          "Combinamos tienda física, catálogo web y soporte digital para mantener continuidad.",
        ],
      },
      {
        title: "Crecimiento",
        body: [
          "Seguimos ampliando categorías y canales para mejorar disponibilidad y tiempos de respuesta.",
          "Trabajamos en estandarizar procesos para escalar con consistencia.",
        ],
      },
    ],
  },
  terminos: {
    group: "legal",
    kicker: "Legal",
    title: "Términos y condiciones",
    intro: "Estas condiciones regulan el uso del sitio, procesos de compra y responsabilidades de ambas partes.",
    accent: "Marco de uso y compra",
    note: "Este contenido es informativo y debe ser revisado por asesoría legal para versión definitiva.",
    highlights: ["Condiciones de compra", "Disponibilidad de stock", "Actualizaciones de política"],
    sections: [
      {
        title: "Compras",
        body: [
          "Los pedidos se confirman según stock disponible y validación del pago.",
          "Las imágenes y descripciones son referenciales y pueden ajustarse por mejora continua.",
        ],
      },
      {
        title: "Actualizaciones",
        body: [
          "Podemos ajustar estos términos para mantener cumplimiento operativo y normativo.",
          "La versión vigente se publicará en esta misma página con fecha de actualización.",
        ],
      },
    ],
  },
  privacidad: {
    group: "legal",
    kicker: "Legal",
    title: "Política de privacidad",
    intro: "Protegemos los datos personales para operar pedidos, atención al cliente y comunicaciones autorizadas.",
    accent: "Tratamiento responsable de datos",
    note: "La protección de datos es un compromiso operativo y legal en todas las interacciones.",
    highlights: ["Uso limitado al servicio", "Seguridad razonable", "Derechos del titular"],
    sections: [
      {
        title: "Datos que usamos",
        body: [
          "Datos de contacto, dirección y detalle de compra necesarios para la operación.",
          "No solicitamos información que no esté vinculada al proceso comercial y de soporte.",
        ],
      },
      {
        title: "Tus derechos",
        body: [
          "Puedes solicitar acceso, corrección o eliminación de tus datos según la normativa vigente.",
          "También puedes restringir comunicaciones comerciales cuando lo desees.",
        ],
      },
    ],
  },
  libroReclamaciones: {
    group: "legal",
    kicker: "Legal",
    title: "Libro de reclamaciones",
    intro: "Canal para registrar reclamos o quejas de forma formal y trazable.",
    accent: "Atención formal y documentada",
    note: "Todo registro debe contener datos mínimos para garantizar respuesta completa.",
    highlights: ["Canal oficial", "Seguimiento trazable", "Respuesta dentro de plazo"],
    sections: [
      {
        title: "Cómo registrar",
        body: [
          "Comparte tus datos, pedido relacionado y detalle del caso para gestionar respuesta.",
          "Incluye evidencia del problema para acelerar análisis y resolución.",
        ],
      },
      {
        title: "Plazos",
        body: [
          "Respondemos dentro de los plazos legales aplicables en Perú.",
          "Cada caso se clasifica y comunica con estado para mantener transparencia.",
        ],
      },
    ],
  },
  contactanos: {
    group: "ayuda",
    kicker: "Ayuda",
    title: "Contáctanos",
    intro: "Estamos listos para ayudarte con asesoría de talla, stock y seguimiento de tu compra.",
    accent: "Respuesta rápida por canales oficiales",
    note: "Para soporte más ágil, escribe con tu nombre y número de pedido (si aplica).",
    highlights: ["WhatsApp directo", "Atención de tienda", "Acompañamiento de compra"],
    sections: [
      {
        title: "Atención",
        body: [
          "WhatsApp: +51 964 052 530. Horario: lunes a domingo, 9:00 a. m. a 7:30 p. m.",
          "Atendemos consultas de catálogo, tallas, estado de pedido y cambios.",
        ],
      },
      {
        title: "Ubicación",
        body: [
          "Mercado Modelo, int. N.° 732, Huancayo, Junín, Perú.",
          "Puedes visitarnos para ver opciones, probar tallas y recibir asesoría presencial.",
        ],
      },
    ],
  },
  rastreoPedido: {
    group: "ayuda",
    kicker: "Ayuda",
    title: "Localiza tu pedido",
    intro: "Consulta estado, validación y avance de entrega de tus pedidos.",
    accent: "Seguimiento claro de principio a fin",
    note: "El tiempo de actualización puede variar según etapa de validación y despacho.",
    highlights: ["Historial de pedidos", "Estados visibles", "Soporte con número de orden"],
    sections: [
      {
        title: "Seguimiento",
        body: [
          "Revisa tu historial en la sección Mis pedidos y el detalle por orden.",
          "Cada pedido muestra estado para que sepas en qué etapa está tu compra.",
        ],
      },
      {
        title: "Soporte",
        body: [
          "Si necesitas ayuda adicional, escríbenos por WhatsApp con tu número de pedido.",
          "Si detectas un error de dirección o contacto, notifícalo cuanto antes.",
        ],
      },
    ],
  },
  preguntasFrecuentes: {
    group: "ayuda",
    kicker: "Ayuda",
    title: "Preguntas frecuentes",
    intro: "Respuestas rápidas para compra, pago, envíos, cambios y stock.",
    accent: "Resuelve dudas en minutos",
    note: "Actualizamos esta sección con base en las consultas más frecuentes de clientes.",
    highlights: ["Dudas de compra", "Información de pagos", "Políticas de cambios"],
    sections: [
      {
        title: "Tallas y stock",
        body: [
          "Mostramos disponibilidad visible y variantes por talla/color cuando están cargadas.",
          "Si una talla no aparece, puede estar sin stock o pendiente de actualización.",
        ],
      },
      {
        title: "Pagos y entregas",
        body: [
          "Confirmamos pedido una vez validado el pago y coordinamos envío según zona.",
          "Los tiempos estimados pueden variar por campaña y volumen de pedidos.",
        ],
      },
    ],
    faq: [
      { question: "¿Puedo cambiar talla si no me quedó?", answer: "Sí, sujeto a disponibilidad y condiciones de cambio publicadas." },
      { question: "¿Cómo sé si mi compra fue confirmada?", answer: "Recibirás actualización del estado del pedido desde tu cuenta o por soporte." },
    ],
  },
  cambios: {
    group: "ayuda",
    kicker: "Ayuda",
    title: "Cambios y devoluciones",
    intro: "Gestionamos cambios por talla o defecto bajo condiciones de uso y plazo.",
    accent: "Proceso claro y con respaldo",
    note: "La revisión aplica criterios de estado, tiempo y comprobante de compra.",
    highlights: ["Condiciones transparentes", "Proceso guiado", "Atención por soporte"],
    sections: [
      {
        title: "Condiciones",
        body: [
          "El producto debe conservar estado original y presentarse dentro del plazo indicado.",
          "No aplican cambios en productos con desgaste por uso o manipulación inadecuada.",
        ],
      },
      {
        title: "Proceso",
        body: [
          "Contacta soporte con evidencia y número de pedido para iniciar la evaluación.",
          "Te indicaremos el canal y siguientes pasos según tu caso.",
        ],
      },
    ],
  },
  clubVilchez: {
    group: "beneficios",
    kicker: "Beneficios",
    title: "Club Vilchez",
    intro: "Programa de beneficios para clientes frecuentes con novedades y ofertas exclusivas.",
    accent: "Beneficios para clientes recurrentes",
    note: "El club evoluciona por temporadas y campañas activas.",
    highlights: ["Promociones tempranas", "Novedades exclusivas", "Comunicación prioritaria"],
    sections: [
      {
        title: "Beneficios",
        body: [
          "Acceso temprano a promociones, recomendaciones y campañas estacionales.",
          "Mayor visibilidad sobre lanzamientos y stock estratégico.",
        ],
      },
      {
        title: "Cómo unirte",
        body: [
          "Crea tu cuenta y activa comunicación por canales oficiales.",
          "Mantén tus datos actualizados para recibir alertas relevantes.",
        ],
      },
    ],
  },
  cuotas: {
    group: "beneficios",
    kicker: "Beneficios",
    title: "Cuotas sin intereses",
    intro: "Ofertas y campañas sujetas a medios de pago y vigencia promocional.",
    accent: "Facilidades de pago en campañas",
    note: "Las condiciones finales dependen del emisor, campaña y términos vigentes.",
    highlights: ["Campañas por vigencia", "Medios de pago elegibles", "Validación en checkout"],
    sections: [
      {
        title: "Disponibilidad",
        body: [
          "Las condiciones pueden variar por campaña, entidad emisora y monto mínimo.",
          "No todas las tarjetas o bancos participan en todas las fechas.",
        ],
      },
      {
        title: "Validación",
        body: [
          "Confirmamos en checkout los medios aplicables en ese momento.",
          "Antes de pagar, revisa términos de campaña y cuotas habilitadas.",
        ],
      },
    ],
  },
};

interface Props {
  pageKey: keyof typeof INFO_CONTENT;
}

const PAGE_ROUTE_MAP: Record<keyof typeof INFO_CONTENT, string> = {
  quienesSomos: INFO_ROUTES.corporativoQuienesSomos,
  nuestraHistoria: INFO_ROUTES.corporativoNuestraHistoria,
  mundoVilchez: INFO_ROUTES.corporativoMundoVilchez,
  terminos: INFO_ROUTES.legalTerminos,
  privacidad: INFO_ROUTES.legalPrivacidad,
  libroReclamaciones: INFO_ROUTES.legalLibroReclamaciones,
  contactanos: INFO_ROUTES.ayudaContacto,
  rastreoPedido: INFO_ROUTES.ayudaRastreoPedido,
  preguntasFrecuentes: INFO_ROUTES.ayudaPreguntasFrecuentes,
  cambios: INFO_ROUTES.ayudaCambios,
  clubVilchez: INFO_ROUTES.beneficiosClubVilchez,
  cuotas: INFO_ROUTES.beneficiosCuotas,
};

export default function InfoPage({ pageKey }: Props) {
  const content = INFO_CONTENT[pageKey];
  const relatedPages = Object.entries(INFO_CONTENT)
    .filter(([key, page]) => page.group === content.group && key !== pageKey)
    .map(([key, page]) => ({
      key,
      title: page.title,
      to: PAGE_ROUTE_MAP[key as keyof typeof INFO_CONTENT],
    }));

  return (
    <main className={`info-page info-page--${content.group}`}>
      <section className="info-page-hero">
        <span className="page-kicker">{content.kicker}</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <div className="info-page-accent">
          <strong>{content.accent}</strong>
          <span>{content.note}</span>
        </div>
      </section>

      <section className="info-page-highlights" aria-label="Aspectos clave">
        {content.highlights.map((highlight) => (
          <article key={highlight} className="info-page-highlight-chip">
            {highlight}
          </article>
        ))}
      </section>

      <div className="info-page-main">
        <section className="info-page-grid">
          {content.sections.map((section) => (
            <article key={section.title} className="info-page-card">
              <h2>{section.title}</h2>
              <div className="info-page-card-copy">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="info-page-aside">
          <article className="info-page-aside-card">
            <h3>En esta sección</h3>
            <div className="info-page-aside-links">
              {relatedPages.length > 0 ? (
                relatedPages.map((page) => (
                  <Link key={page.key} to={page.to} className="info-page-aside-link">
                    {page.title}
                  </Link>
                ))
              ) : (
                <span className="info-page-aside-empty">No hay páginas relacionadas por ahora.</span>
              )}
            </div>
          </article>
          <article className="info-page-aside-card">
            <h3>Acciones rápidas</h3>
            <div className="info-page-aside-actions">
              <Link to="/productos" className="btn-primary">Explorar catálogo</Link>
              <Link to="/tiendas" className="btn-ghost">Visitar tienda</Link>
            </div>
          </article>
        </aside>
      </div>

      {content.faq && content.faq.length > 0 ? (
        <section className="info-page-faq" aria-label="Preguntas frecuentes de la página">
          <h2>Preguntas clave</h2>
          <div className="info-page-faq-grid">
            {content.faq.map((item) => (
              <article key={item.question} className="info-page-faq-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="info-page-actions">
        <Link to="/productos" className="btn-primary">Explorar catálogo</Link>
        <Link to="/tiendas" className="btn-ghost">Visitar tienda física</Link>
      </div>
    </main>
  );
}

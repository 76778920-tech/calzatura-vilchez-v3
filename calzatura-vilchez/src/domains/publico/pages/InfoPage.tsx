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
    intro: "Al realizar una compra o crear una cuenta en Calzatura Vilchez aceptas las condiciones descritas en esta página. Te recomendamos leerlas antes de completar tu pedido.",
    accent: "Vigente desde enero 2025",
    note: "Ante cualquier duda escríbenos por WhatsApp al +51 964 052 530.",
    highlights: ["Compras y pagos", "Envíos y entregas", "Cambios y devoluciones"],
    sections: [
      {
        title: "Compras y pagos",
        body: [
          "Los pedidos quedan confirmados una vez que el pago ha sido validado exitosamente. Calzatura Vilchez se reserva el derecho de cancelar un pedido si el producto no está disponible en stock, notificando al cliente con la mayor brevedad posible.",
          "Los precios publicados en el sitio incluyen IGV y están expresados en soles peruanos (PEN). Nos reservamos el derecho de modificar precios sin previo aviso, pero el precio vigente al momento del pago es el que aplica a tu pedido.",
          "Aceptamos pagos mediante tarjetas de débito y crédito (Visa, Mastercard) procesados de forma segura a través de Stripe. No almacenamos datos de tarjetas en nuestros servidores.",
        ],
      },
      {
        title: "Envíos y entregas",
        body: [
          "Realizamos envíos a todo el Perú a través de empresas de courier. Los tiempos de entrega son referenciales y pueden variar según la zona de destino, temporada y volumen de pedidos.",
          "El costo de envío se calcula al momento del checkout según la dirección de entrega. Los pedidos en Huancayo pueden estar sujetos a recojo en tienda según coordinación previa.",
          "Calzatura Vilchez no se responsabiliza por demoras ocasionadas por la empresa de courier, desastres naturales, huelgas u otros eventos fuera de nuestro control.",
        ],
      },
      {
        title: "Uso del sitio",
        body: [
          "El contenido de este sitio (imágenes, textos, logos y diseño) es propiedad de Calzatura Vilchez. Está prohibida su reproducción total o parcial sin autorización escrita.",
          "El usuario se compromete a no utilizar el sitio para actividades fraudulentas, distribuir contenido malicioso o intentar acceder a áreas restringidas del sistema.",
          "Calzatura Vilchez puede actualizar estos términos en cualquier momento. La versión vigente siempre estará publicada en esta página con su fecha de última actualización.",
        ],
      },
    ],
    faq: [
      { question: "¿Puedo cancelar un pedido después de pagarlo?", answer: "Puedes solicitarlo escribiéndonos por WhatsApp. Si el pedido aún no fue despachado, gestionamos la cancelación y el reembolso según el medio de pago utilizado." },
      { question: "¿Qué pasa si recibo un producto diferente al que pedí?", answer: "Comunícate con nosotros dentro de las 48 horas de recibido el producto con fotos del mismo. Lo solucionamos con reemplazo o devolución sin costo adicional." },
    ],
  },
  privacidad: {
    group: "legal",
    kicker: "Legal",
    title: "Política de privacidad",
    intro: "En Calzatura Vilchez respetamos y protegemos la privacidad de nuestros clientes. Esta política explica qué datos recopilamos, cómo los usamos y qué derechos tienes sobre ellos.",
    accent: "Tus datos, bajo tu control",
    note: "Cumplimos con la Ley N.° 29733 de Protección de Datos Personales del Perú.",
    highlights: ["Datos que recopilamos", "Cómo los usamos", "Tus derechos"],
    sections: [
      {
        title: "Datos que recopilamos",
        body: [
          "Al crear una cuenta recopilamos tu nombre completo, DNI, correo electrónico y número de celular. Estos datos son necesarios para verificar tu identidad y gestionar tu cuenta.",
          "Al realizar un pedido recopilamos tu dirección de entrega, datos de contacto y los detalles del producto adquirido. Esta información es indispensable para procesar y entregar tu compra.",
          "Nuestro sistema puede registrar automáticamente tu dirección IP, tipo de dispositivo y páginas visitadas con fines de seguridad y mejora del servicio. No vendemos ni compartimos estos datos con terceros con fines comerciales.",
        ],
      },
      {
        title: "Cómo usamos tus datos",
        body: [
          "Usamos tus datos para procesar pedidos, coordinar envíos, brindarte soporte postventa y enviarte comunicaciones relacionadas con tus compras (confirmaciones, estados de pedido).",
          "Con tu consentimiento expreso podemos enviarte información sobre nuevas colecciones, promociones y campañas de temporada. Puedes darte de baja en cualquier momento.",
          "Compartimos datos estrictamente necesarios con proveedores de pago (Stripe) y servicios de autenticación (Firebase) bajo acuerdos de confidencialidad y solo para cumplir el servicio contratado.",
        ],
      },
      {
        title: "Tus derechos",
        body: [
          "Tienes derecho a acceder, corregir o eliminar tus datos personales en cualquier momento. Para ejercer estos derechos escríbenos al WhatsApp +51 964 052 530 o visítanos en tienda.",
          "Puedes solicitar la portabilidad de tus datos o restringir su tratamiento. Responderemos tu solicitud en un plazo máximo de 15 días hábiles conforme a la normativa vigente.",
          "Si consideras que tus datos han sido tratados de manera indebida puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales (ANPDP).",
        ],
      },
    ],
    faq: [
      { question: "¿Calzatura Vilchez vende mis datos a terceros?", answer: "No. Tus datos personales nunca son vendidos ni cedidos a terceros con fines comerciales. Solo los compartimos con proveedores tecnológicos necesarios para operar el servicio (pago, autenticación)." },
      { question: "¿Cómo puedo eliminar mi cuenta?", answer: "Escríbenos por WhatsApp o visítanos en tienda. Eliminaremos tu cuenta y datos personales en un plazo de 10 días hábiles, salvo obligación legal de conservarlos." },
    ],
  },
  libroReclamaciones: {
    group: "legal",
    kicker: "Legal",
    title: "Libro de reclamaciones",
    intro: "Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571), Calzatura Vilchez pone a tu disposición este canal formal para registrar reclamos y quejas.",
    accent: "Respuesta en máximo 30 días calendario",
    note: "Un reclamo expresa disconformidad con el producto o servicio. Una queja expresa malestar con la atención recibida. Ambos tienen el mismo trámite.",
    highlights: ["Canal oficial", "Respuesta garantizada", "Sin costo para el consumidor"],
    sections: [
      {
        title: "Cómo presentar tu reclamo",
        body: [
          "Escríbenos por WhatsApp al +51 964 052 530 indicando: tu nombre completo, DNI, correo de contacto, número de pedido (si aplica), descripción detallada del problema y qué solución esperas.",
          "También puedes presentarlo de forma presencial en nuestra tienda ubicada en el Mercado Modelo, int. N.° 732, Huancayo, Junín, de lunes a domingo de 9:00 a.m. a 7:30 p.m.",
          "Guarda evidencia del problema (fotos, capturas de pantalla, comprobante de compra). Esto agiliza el análisis y la resolución del caso.",
        ],
      },
      {
        title: "Tiempos de respuesta y seguimiento",
        body: [
          "Acusaremos recibo de tu reclamo en un plazo máximo de 3 días hábiles. La respuesta definitiva se emitirá dentro de los 30 días calendario siguientes, conforme a Ley.",
          "En casos de productos defectuosos o envíos erróneos, buscamos resolver en un plazo menor con reemplazo inmediato o reembolso según corresponda.",
          "Recibirás el estado de tu reclamo por el mismo canal en que lo presentaste. Si no recibes respuesta en el plazo establecido, puedes escalar el caso ante el Indecopi.",
        ],
      },
    ],
    faq: [
      { question: "¿Qué diferencia hay entre un reclamo y una queja?", answer: "Un reclamo es una disconformidad con el producto o servicio recibido (talla incorrecta, producto dañado, demora en el envío). Una queja es sobre la atención al cliente. Ambos se gestionan por el mismo canal." },
      { question: "¿Puedo acudir al Indecopi directamente?", answer: "Sí. Tienes derecho a presentar tu caso ante el Indecopi en cualquier momento. Sin embargo, te invitamos a contactarnos primero para resolver la situación de manera rápida y directa." },
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

type Props = Readonly<{
  pageKey: keyof typeof INFO_CONTENT;
}>;

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

function infoContentEntries() {
  return Object.entries(INFO_CONTENT) as Array<[keyof typeof INFO_CONTENT, InfoContent]>;
}

export default function InfoPage({ pageKey }: Props) {
  const content = INFO_CONTENT[pageKey];
  const relatedPages = infoContentEntries()
    .filter(([key, page]) => page.group === content.group && key !== pageKey)
    .map(([key, page]) => ({
      key,
      title: page.title,
      to: PAGE_ROUTE_MAP[key],
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

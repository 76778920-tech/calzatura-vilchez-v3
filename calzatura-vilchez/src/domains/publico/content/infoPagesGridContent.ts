import { buildInfoGridPage } from "./infoPageBuilders";
import type { InfoContent, InfoPageKey } from "./infoPageTypes";

export const CORPORATIVO_INFO_PAGES: Pick<
  Record<InfoPageKey, InfoContent>,
  "quienesSomos" | "nuestraHistoria" | "mundoVilchez"
> = {
  quienesSomos: buildInfoGridPage({
    group: "corporativo",
    kicker: "Corporativo",
    title: "¿Quiénes somos?",
    intro:
      "Calzatura Vilchez es una tienda familiar enfocada en calzado cómodo, durable y accesible para cada etapa del día.",
    accent: "Calidad real para uso diario",
    note: "Nuestro objetivo es unir experiencia de tienda física y claridad digital para que comprar sea más simple y seguro.",
    highlights: ["Curaduría por uso real", "Acompañamiento por WhatsApp", "Stock visible y actualizado"],
    blocks: [
      {
        title: "Nuestro enfoque",
        paragraphs: [
          "Seleccionamos pares con buen calce, materiales confiables y una propuesta clara por uso: diario, oficina, escolar y urbano.",
          "Evitamos catálogos inflados; priorizamos opciones que realmente rotan y resuelven necesidades concretas.",
        ],
      },
      {
        title: "Cómo trabajamos",
        paragraphs: [
          "Priorizamos atención personalizada, recomendaciones por talla y soporte postventa para que compres con seguridad.",
          "Cada recomendación parte de contexto real: tipo de uso, frecuencia, superficie y presupuesto.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Venden solo en Huancayo?",
        answer: "Atendemos desde Huancayo y coordinamos envíos según cobertura disponible.",
      },
      {
        question: "¿Puedo pedir recomendación antes de comprar?",
        answer: "Sí. Te orientamos por WhatsApp con opciones por talla, uso y presupuesto.",
      },
    ],
  }),
  nuestraHistoria: buildInfoGridPage({
    group: "corporativo",
    kicker: "Corporativo",
    title: "Nuestra historia",
    intro:
      "Nacimos desde el comercio local y evolucionamos hacia una vitrina digital para atender mejor a nuestros clientes.",
    accent: "Crecimiento con enfoque práctico",
    note: "La evolución digital no reemplaza la atención humana: la complementa y la vuelve más rápida.",
    highlights: ["Origen local", "Aprendizaje continuo", "Evolución omnicanal"],
    blocks: [
      {
        title: "Origen",
        paragraphs: [
          "Comenzamos atendiendo en tienda física con curaduría manual de modelos más solicitados.",
          "El conocimiento del cliente nació del trato directo y recomendaciones personalizadas.",
        ],
      },
      {
        title: "Hoy",
        paragraphs: [
          "Integramos catálogo en línea y experiencia omnicanal para conectar asesoría, stock y entrega.",
          "El sitio web actúa como una vitrina viva para acelerar la decisión de compra.",
        ],
      },
    ],
  }),
  mundoVilchez: buildInfoGridPage({
    group: "corporativo",
    kicker: "Corporativo",
    title: "Calzatura Vilchez en el mundo",
    intro: "Estamos construyendo una presencia digital escalable para llegar a más clientes en Perú.",
    accent: "Escalamos sin perder cercanía",
    note: "La visión es crecer de forma sostenible, conservando servicio humano y procesos claros.",
    highlights: ["Cobertura progresiva", "Modelo escalable", "Marca con identidad propia"],
    blocks: [
      {
        title: "Presencia",
        paragraphs: [
          "Atendemos desde Huancayo y coordinamos despachos según cobertura disponible.",
          "Combinamos tienda física, catálogo web y soporte digital para mantener continuidad.",
        ],
      },
      {
        title: "Crecimiento",
        paragraphs: [
          "Seguimos ampliando categorías y canales para mejorar disponibilidad y tiempos de respuesta.",
          "Trabajamos en estandarizar procesos para escalar con consistencia.",
        ],
      },
    ],
  }),
};

export const AYUDA_INFO_PAGES: Pick<
  Record<InfoPageKey, InfoContent>,
  "contactanos" | "rastreoPedido" | "preguntasFrecuentes" | "cambios"
> = {
  contactanos: buildInfoGridPage({
    group: "ayuda",
    kicker: "Ayuda",
    title: "Contáctanos",
    intro: "Estamos listos para ayudarte con asesoría de talla, stock y seguimiento de tu compra.",
    accent: "Respuesta rápida por canales oficiales",
    note: "Para soporte más ágil, escribe con tu nombre y número de pedido (si aplica).",
    highlights: ["WhatsApp directo", "Atención de tienda", "Acompañamiento de compra"],
    blocks: [
      {
        title: "Atención",
        paragraphs: [
          "WhatsApp: +51 964 052 530. Horario: lunes a domingo, 9:00 a. m. a 7:30 p. m.",
          "Atendemos consultas de catálogo, tallas, estado de pedido y cambios.",
        ],
      },
      {
        title: "Ubicación",
        paragraphs: [
          "Mercado Modelo, int. N.° 732, Huancayo, Junín, Perú.",
          "Puedes visitarnos para ver opciones, probar tallas y recibir asesoría presencial.",
        ],
      },
    ],
  }),
  rastreoPedido: buildInfoGridPage({
    group: "ayuda",
    kicker: "Ayuda",
    title: "Localiza tu pedido",
    intro: "Consulta estado, validación y avance de entrega de tus pedidos.",
    accent: "Seguimiento claro de principio a fin",
    note: "El tiempo de actualización puede variar según etapa de validación y despacho.",
    highlights: ["Historial de pedidos", "Estados visibles", "Soporte con número de orden"],
    blocks: [
      {
        title: "Seguimiento",
        paragraphs: [
          "Revisa tu historial en la sección Mis pedidos y el detalle por orden.",
          "Cada pedido muestra estado para que sepas en qué etapa está tu compra.",
        ],
      },
      {
        title: "Soporte",
        paragraphs: [
          "Si necesitas ayuda adicional, escríbenos por WhatsApp con tu número de pedido.",
          "Si detectas un error de dirección o contacto, notifícalo cuanto antes.",
        ],
      },
    ],
  }),
  preguntasFrecuentes: buildInfoGridPage({
    group: "ayuda",
    kicker: "Ayuda",
    title: "Preguntas frecuentes",
    intro: "Respuestas rápidas para compra, pago, envíos, cambios y stock.",
    accent: "Resuelve dudas en minutos",
    note: "Actualizamos esta sección con base en las consultas más frecuentes de clientes.",
    highlights: ["Dudas de compra", "Información de pagos", "Políticas de cambios"],
    blocks: [
      {
        title: "Tallas y stock",
        paragraphs: [
          "Mostramos disponibilidad visible y variantes por talla/color cuando están cargadas.",
          "Si una talla no aparece, puede estar sin stock o pendiente de actualización.",
        ],
      },
      {
        title: "Pagos y entregas",
        paragraphs: [
          "Confirmamos pedido una vez validado el pago y coordinamos envío según zona.",
          "Los tiempos estimados pueden variar por campaña y volumen de pedidos.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Puedo cambiar talla si no me quedó?",
        answer: "Sí, sujeto a disponibilidad y condiciones de cambio publicadas.",
      },
      {
        question: "¿Cómo sé si mi compra fue confirmada?",
        answer: "Recibirás actualización del estado del pedido desde tu cuenta o por soporte.",
      },
    ],
  }),
  cambios: buildInfoGridPage({
    group: "ayuda",
    kicker: "Ayuda",
    title: "Cambios y devoluciones",
    intro: "Gestionamos cambios por talla o defecto bajo condiciones de uso y plazo.",
    accent: "Proceso claro y con respaldo",
    note: "La revisión aplica criterios de estado, tiempo y comprobante de compra.",
    highlights: ["Condiciones transparentes", "Proceso guiado", "Atención por soporte"],
    blocks: [
      {
        title: "Condiciones",
        paragraphs: [
          "El producto debe conservar estado original y presentarse dentro del plazo indicado.",
          "No aplican cambios en productos con desgaste por uso o manipulación inadecuada.",
        ],
      },
      {
        title: "Proceso",
        paragraphs: [
          "Contacta soporte con evidencia y número de pedido para iniciar la evaluación.",
          "Te indicaremos el canal y siguientes pasos según tu caso.",
        ],
      },
    ],
  }),
};

export const BENEFICIOS_INFO_PAGES: Pick<
  Record<InfoPageKey, InfoContent>,
  "clubVilchez" | "cuotas"
> = {
  clubVilchez: buildInfoGridPage({
    group: "beneficios",
    kicker: "Beneficios",
    title: "Club Vilchez",
    intro:
      "Programa de beneficios para clientes frecuentes con novedades y ofertas exclusivas.",
    accent: "Beneficios para clientes recurrentes",
    note: "El club evoluciona por temporadas y campañas activas.",
    highlights: ["Promociones tempranas", "Novedades exclusivas", "Comunicación prioritaria"],
    blocks: [
      {
        title: "Beneficios",
        paragraphs: [
          "Acceso temprano a promociones, recomendaciones y campañas estacionales.",
          "Mayor visibilidad sobre lanzamientos y stock estratégico.",
        ],
      },
      {
        title: "Cómo unirte",
        paragraphs: [
          "Crea tu cuenta y activa comunicación por canales oficiales.",
          "Mantén tus datos actualizados para recibir alertas relevantes.",
        ],
      },
    ],
  }),
  cuotas: buildInfoGridPage({
    group: "beneficios",
    kicker: "Beneficios",
    title: "Cuotas sin intereses",
    intro: "Ofertas y campañas sujetas a medios de pago y vigencia promocional.",
    accent: "Facilidades de pago en campañas",
    note: "Las condiciones finales dependen del emisor, campaña y términos vigentes.",
    highlights: ["Campañas por vigencia", "Medios de pago elegibles", "Validación en checkout"],
    blocks: [
      {
        title: "Disponibilidad",
        paragraphs: [
          "Las condiciones pueden variar por campaña, entidad emisora y monto mínimo.",
          "No todas las tarjetas o bancos participan en todas las fechas.",
        ],
      },
      {
        title: "Validación",
        paragraphs: [
          "Confirmamos en checkout los medios aplicables en ese momento.",
          "Antes de pagar, revisa términos de campaña y cuotas habilitadas.",
        ],
      },
    ],
  }),
};

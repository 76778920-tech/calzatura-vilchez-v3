import { buildInfoProsePage, legalSections } from "../infoPageBuilders";

export const COOKIES_LEGAL_PAGE = buildInfoProsePage({
      group: "legal",
    kicker: "Legal",
    title: "Política de cookies",
    intro:
      "La presente Política de Cookies forma parte integrante de la Política de Privacidad de Calzatura Vilchez. En ella se describe el uso de cookies y tecnologías de almacenamiento similares en el sitio web de la tienda en línea, las finalidades de cada categoría, la forma en que puedes otorgar o retirar tu consentimiento, y los derechos que te asisten como titular de datos personales en el Perú.",
    accent: "Consentimiento informado y control sobre tu navegación",
    note: "Última actualización: 26 de mayo de 2026 · Versión de consentimiento 1.1",
    highlights: [
      "Definición y tipología",
      "Gestión del consentimiento",
      "Inventario y derechos",
    ],
  sections: legalSections(
      ["1. ¿Qué son las cookies y tecnologías similares?",
        "Las cookies son pequeños archivos de texto que un sitio web almacena en tu ordenador, tableta o teléfono móvil cuando lo visitas. Permiten, entre otras cosas, que el sitio recuerde tus acciones y preferencias durante un periodo de tiempo, de modo que no tengas que volver a configurarlas cada vez que regreses o navegues de una página a otra.",
        "Además de cookies, utilizamos tecnologías equivalentes de almacenamiento local en el navegador (por ejemplo, almacenamiento de sesión o almacenamiento persistente) cuando resulta necesario para el funcionamiento del carrito, la sesión de usuario o tus preferencias de visualización.",
        "Las cookies pueden ser de sesión (se eliminan al cerrar el navegador) o persistentes (permanecen hasta su fecha de caducidad o hasta que las borres manualmente).",
      ],
      ["2. ¿Quién utiliza las cookies?",
        "Cookies propias: instaladas y gestionadas directamente por Calzatura Vilchez o en nuestro nombre, para operar la tienda en línea.",
        "Cookies de terceros: instaladas por proveedores que nos prestan servicios necesarios, como procesamiento de pagos, autenticación de usuarios, protección contra tráfico malicioso o alojamiento del sitio. Estos terceros actúan como encargados o responsables independientes según su propia política, dentro de los límites de nuestras instrucciones contractuales.",
      ],
      ["3. Relación con datos personales",
        "Algunas cookies pueden recopilar o asociarse con identificadores que, combinados con otros datos, permiten identificarte. En esos casos, el tratamiento se considera tratamiento de datos personales y se rige por la Ley N.° 29733 y su Reglamento, además de por esta política y por nuestra Política de privacidad.",
        "La información obtenida a través de cookies no esenciales solo se utilizará para las finalidades descritas en el panel de consentimiento y en el inventario de la sección 10.",
      ],
      ["4. Base legal del tratamiento",
        "Las cookies estrictamente necesarias se fundamentan en la necesidad de ejecutar el servicio solicitado por el usuario y en el interés legítimo de garantizar la seguridad y estabilidad del sitio.",
        "Las cookies funcionales, de seguridad y, en su caso, de medición o marketing, se activan con base en tu consentimiento libre, específico e informado, otorgado mediante el banner o el panel de configuración de cookies.",
        "Puedes retirar tu consentimiento en cualquier momento sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada, en los términos permitidos por la ley.",
      ],
      ["5. Cómo otorgar, rechazar o modificar tu consentimiento",
        "Al acceder por primera vez al sitio se muestra un aviso de cookies con tres opciones principales: aceptar todas las categorías disponibles, limitar el uso a las estrictamente necesarias, o abrir la configuración detallada para activar o desactivar cada categoría de forma individual.",
        "Puedes cambiar tu decisión en cualquier momento haciendo clic en el enlace «Configuración de cookies» ubicado en el pie de página del sitio.",
        "Si rechazas las cookies funcionales o de seguridad, podrás seguir consultando el catálogo de productos, pero es posible que no puedas registrarte, iniciar sesión, guardar el carrito entre visitas o completar un pago en línea hasta que autorices las categorías necesarias para esas funciones.",
        "La retirada del consentimiento no obliga a borrar automáticamente cookies ya instaladas; deberás eliminarlas desde la configuración de tu navegador si deseas suprimirlas de inmediato.",
      ],
      ["6. Gestión de cookies desde tu navegador",
        "Puedes configurar tu navegador para bloquear, alertar sobre o eliminar cookies. Los pasos varían según el programa que utilices. A título orientativo, consulta la sección de ayuda de tu navegador o las páginas de soporte de Chrome, Firefox, Safari, Microsoft Edge u Opera.",
        "Si bloqueas todas las cookies, incluidas las necesarias, es probable que algunas secciones del sitio no funcionen correctamente o que debas introducir tus datos en cada visita.",
        "El modo de navegación privada o incógnito limita la persistencia de cookies, pero no sustituye al panel de consentimiento de Calzatura Vilchez para las categorías que requieren autorización expresa.",
      ],
      ["7. Plazos de conservación",
        "Cada cookie o tecnología similar tiene un periodo de conservación determinado según su finalidad, que puede ir desde la duración de tu sesión de navegación hasta varios meses, como se indica en el inventario detallado de la siguiente sección.",
        "Tu elección de consentimiento se conserva durante un plazo máximo de doce (12) meses, tras el cual te solicitaremos nuevamente tu preferencia si accedes al sitio.",
      ],
      ["8. Ejercicio de derechos y reclamos",
        "Puedes ejercer los derechos de acceso, rectificación, cancelación, oposición y revocación del consentimiento respecto de los datos personales tratados mediante cookies, dirigiéndote a los canales indicados en nuestra Política de privacidad (WhatsApp +51 964 052 530 o atención en tienda).",
        "Responderemos en el plazo máximo de quince (15) días hábiles, con las prórrogas que permita la ley.",
        "Si consideras que tus derechos no han sido atendidos, puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales (ANPDP), Mesa de Partes del Ministerio de Justicia y Derechos Humanos, Calle Scipión Llona N.° 350, Miraflores, Lima.",
      ],
      ["9. Actualizaciones de esta política",
        "Podemos modificar esta Política de Cookies cuando incorporemos nuevas funcionalidades, cambien los proveedores que utilizamos o se actualice la normativa aplicable. Publicaremos la versión vigente en esta página e indicaremos la fecha de última actualización.",
        "Cuando el cambio implique nuevas categorías de cookies o finalidades que requieran consentimiento, te solicitaremos de nuevo tu autorización mediante el banner o el panel de configuración.",
      ]
  ),
  faq: [
      {
        question: "¿Debo aceptar todas las cookies para usar la tienda?",
        answer:
          "No. Solo las estrictamente necesarias son imprescindibles para la navegación básica. Para comprar, registrarte o pagar en línea normalmente deberás autorizar, como mínimo, las categorías funcionales y de seguridad descritas en esta política.",
      },
      {
        question: "¿Utilizan cookies de Facebook, Google Ads o similares?",
        answer:
          "En la actualidad no empleamos cookies de publicidad en redes sociales ni píxeles de remarketing en este sitio web. Si en el futuro los incorporamos, lo indicaremos en esta política y pediremos tu consentimiento previo.",
      },
      {
        question: "¿Qué ocurre si pulso «Solo necesarias»?",
        answer:
          "Se activarán únicamente las cookies imprescindibles. Podrás ver el catálogo, pero funciones como el carrito persistente, el inicio de sesión o el pago en línea pueden quedar limitadas hasta que autorices otras categorías desde el panel de configuración.",
      },
      {
        question: "¿Cada cuánto se me vuelve a preguntar?",
        answer:
          "Tu elección se guarda durante un máximo de doce (12) meses o hasta que cambiemos de versión de política de forma sustancial, en cuyo caso te mostraremos de nuevo el aviso de cookies.",
      },
    ],
});

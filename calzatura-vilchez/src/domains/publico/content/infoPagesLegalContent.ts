import { providerIdentificationParagraphs } from "@/config/businessContact";
import {
  complaintPlazosInfoPageAccent,
  complaintPlazosInfoPageBody,
  complaintPlazosTerminosReferencia,
} from "@/domains/publico/utils/complaintLegalPlazos";
import type { InfoContent, InfoPageKey } from "./infoPageTypes";

const PROVIDER_ID_BODY = providerIdentificationParagraphs();

export const LEGAL_INFO_PAGES: Pick<
  Record<InfoPageKey, InfoContent>,
  "terminos" | "privacidad" | "politicaCookies" | "libroReclamaciones"
> = {
  terminos: {
    group: "legal",
    kicker: "Legal",
    title: "Términos y condiciones",
    intro:
      "Los presentes Términos y Condiciones regulan el acceso y uso del sitio web de Calzatura Vilchez, la creación de cuentas de usuario y la compra de productos a través de la tienda en línea. Al registrarte, navegar o confirmar un pedido, declaras ser mayor de edad, contar con capacidad legal para contratar y aceptar íntegramente este documento, la Política de Privacidad y la Política de Cookies publicadas en el sitio.",
    accent: "Contrato de compraventa a distancia conforme a la normativa peruana",
    note: "Última actualización: 26 de mayo de 2026. Marco de referencia: Ley N.° 29571 y normas de comercio electrónico aplicables.",
    highlights: [
      "Identificación del proveedor",
      "Compra, pago y entrega",
      "Garantías y reclamos",
    ],
    sections: [
      {
        title: "1. Objeto y documentos contractuales",
        body: [
          "El objeto de estos Términos y Condiciones es establecer las reglas que rigen la relación comercial entre Calzatura Vilchez, en adelante «la Empresa» o «nosotros», y el usuario o consumidor, en adelante «el Cliente» o «tú», en el marco de las ventas realizadas a través del sitio web.",
          "Forman parte integrante del contrato: (i) estos Términos y Condiciones; (ii) la Política de Privacidad; (iii) la Política de Cookies; (iv) la información descriptiva del producto, precio y disponibilidad mostrada en la ficha al momento de la compra; (v) las condiciones específicas de promociones o campañas, cuando existan; y (vi) la página de Cambios y devoluciones y el Libro de reclamaciones, para todo lo relativo a postventa.",
          "En caso de contradicción entre documentos, prevalecerá la información más favorable al consumidor cuando la ley así lo exija; en lo demás, prevalecerá el orden indicado y la confirmación de pedido.",
        ],
      },
      {
        title: "2. Identificación del proveedor",
        body: [
          ...PROVIDER_ID_BODY,
          "Sitio web: tienda en línea operada por Calzatura Vilchez, accesible desde el Perú.",
        ],
      },
      {
        title: "3. Capacidad, registro y veracidad de los datos",
        body: [
          "Los servicios de compra en línea están destinados a personas naturales mayores de dieciocho (18) años con capacidad legal para contratar.",
          "Para registrarte debes proporcionar información veraz, actual y completa (nombre, documento de identidad, correo electrónico y celular, entre otros datos solicitados). Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.",
          "La Empresa puede suspender o cancelar cuentas que presenten datos falsos, usos fraudulentos, incumplimiento de estos términos o conductas que afecten la seguridad del sitio o de otros usuarios.",
        ],
      },
      {
        title: "4. Información de productos, precios y disponibilidad",
        body: [
          "Las fotografías, descripciones, materiales, tallas y referencias de los productos tienen carácter orientativo. Procuramos que reflejen fielmente el artículo ofrecido, pero pueden existir variaciones menores de tono o textura propias del material.",
          "Los precios publicados en el sitio se expresan en soles peruanos (PEN) e incluyen el Impuesto General a las Ventas (IGV), salvo indicación expresa en contrario.",
          "La disponibilidad de stock se muestra en tiempo real o con actualización periódica. Si tras confirmar tu pedido un producto no estuviera disponible, te contactaremos para ofrecerte alternativas, sustitución o reembolso conforme a la ley.",
          "Nos reservamos el derecho de corregir errores manifestos de precio o descripción antes de la confirmación definitiva del pedido, informándote en ese caso antes de cargar el pago.",
        ],
      },
      {
        title: "5. Proceso de compra y confirmación del pedido",
        body: [
          "Para realizar una compra debes seleccionar los productos, indicar talla y cantidad, completar los datos de entrega y elegir el medio de pago habilitado.",
          "Antes de pagar podrás revisar el resumen del pedido, incluidos subtotal, costo de envío, descuentos aplicables e impuestos.",
          "El pedido se considera recibido cuando completas el proceso de pago. La confirmación contractual se perfecciona cuando el pago es aprobado por el proveedor de medios de pago o cuando aceptamos expresamente tu pedido en los casos de métodos que requieran validación manual.",
          "Recibirás una confirmación por los medios de contacto registrados (correo electrónico o notificación en tu cuenta). Conserva el número de pedido para seguimiento y reclamos.",
        ],
      },
      {
        title: "6. Medios de pago",
        body: [
          "Aceptamos pagos con tarjetas de débito y crédito de las redes habilitadas en el checkout (por ejemplo, Visa y Mastercard), procesados de forma segura a través de un proveedor de pagos autorizado.",
          "No almacenamos en nuestros servidores los datos completos de tu tarjeta. El tratamiento de datos de pago se rige por la política del proveedor de pagos y por nuestra Política de Privacidad.",
          "En caso de rechazo del pago por el emisor de la tarjeta, el pedido no será confirmado. Puedes intentar nuevamente con otro medio habilitado o contactarnos para asistencia.",
          "Los cargos aparecerán en el extracto bajo la denominación que indique el proveedor de pagos o la Empresa, según corresponda.",
        ],
      },
      {
        title: "7. Envíos, plazos y transferencia de riesgo",
        body: [
          "Realizamos envíos a distintas zonas del Perú a través de empresas de courier o medios logísticos habilitados. El costo y el plazo estimado de entrega se calculan en el checkout según la dirección indicada.",
          "Los plazos de entrega son referenciales y empiezan a contar desde la confirmación del pago y la preparación del pedido, no desde la sola fecha de compra. Pueden verse afectados por feriados, condiciones climáticas, huelgas, alta demanda estacional o causas ajenas a nuestra voluntad razonable.",
          "En Huancayo y zonas cercanas puede ofrecerse recojo en tienda o coordinación de entrega local, según disponibilidad indicada al momento de la compra.",
          "El riesgo de pérdida o daño del producto durante el transporte es asumido por la Empresa hasta la entrega al Cliente o a la persona autorizada, salvo que la ley disponga otra cosa. Si recibes un paquete visiblemente dañado, indícalo al courier y contáctanos de inmediato con evidencia fotográfica.",
        ],
      },
      {
        title: "8. Cambios, devoluciones y desistimiento",
        body: [
          "Como consumidor tienes los derechos reconocidos en la Ley N.° 29571 y normas complementarias, incluidos los relacionados con productos defectuosos, no conformes o errores de envío atribuibles a la Empresa.",
          "Las condiciones específicas de plazos, estado del producto, costos de envío en devoluciones y procedimiento se detallan en la página «Cambios y devoluciones» del sitio, que debes consultar antes de solicitar un cambio.",
          "Los productos deben devolverse en condiciones razonables de uso exclusivamente para verificación de talla en interiores, sin señales de uso en exteriores, con etiquetas cuando corresponda, salvo defecto de fábrica o error nuestro.",
          "Los reembolsos, cuando procedan, se realizarán por el mismo medio de pago utilizado o por otro medio acordado, en un plazo razonable una vez recibido y verificado el producto.",
        ],
      },
      {
        title: "9. Garantías",
        body: [
          "Los productos comercializados están sujetos a la garantía legal prevista en el Código de Protección y Defensa del Consumidor por vicios ocultos o defectos de fabricación.",
          "La garantía comercial adicional, si la hubiera, se indicará en la ficha del producto o en la comunicación de campaña. En ningún caso la garantía del fabricante o distribuidor reduce tus derechos legales como consumidor.",
        ],
      },
      {
        title: "10. Promociones, cupones y programas de beneficios",
        body: [
          "Las promociones, descuentos, cupones o beneficios del Club Vilchez están sujetos a condiciones específicas publicadas en cada campaña (vigencia, productos incluidos, montos mínimos, uso único, no acumulable, etc.).",
          "La Empresa puede modificar o finalizar campañas con previo aviso razonable en el sitio. No es posible canjear cupones vencidos o utilizados, salvo error imputable a la Empresa.",
        ],
      },
      {
        title: "11. Uso permitido del sitio web",
        body: [
          "Te concedemos una licencia limitada, no exclusiva y revocable para acceder al sitio y utilizarlo con fines personales de información y compra.",
          "Queda prohibido: copiar o extraer masivamente contenidos; utilizar robots o scripts no autorizados; intentar vulnerar la seguridad; suplantar identidad; publicar contenido ilícito; o usar el sitio con fines comerciales ajenos sin autorización escrita.",
          "Podemos restringir el acceso al sitio por mantenimiento, actualización o causas de fuerza mayor, procurando minimizar las molestias.",
        ],
      },
      {
        title: "12. Propiedad intelectual",
        body: [
          "Las marcas, logotipos, diseño, textos, fotografías, bases de datos y software del sitio son propiedad de Calzatura Vilchez o de sus licenciantes y están protegidos por la legislación peruana e internacional aplicable.",
          "Queda prohibida su reproducción, distribución, comunicación pública o transformación sin autorización previa y por escrito, salvo los usos permitidos por ley.",
        ],
      },
      {
        title: "13. Limitación de responsabilidad",
        body: [
          "La Empresa responde por el cumplimiento de sus obligaciones legales y contractuales en los términos previstos en la normativa de consumo. No excluimos ni limitamos responsabilidades que no puedan limitarse por ley.",
          "No seremos responsables por daños indirectos, lucro cesante o pérdida de datos derivados del uso del sitio cuando medie culpa del Cliente, caso fortuito o fuerza mayor, sin perjuicio de tus derechos irrenunciables como consumidor.",
          "Los enlaces a sitios de terceros se ofrecen solo para conveniencia; no controlamos ni garantizamos su contenido.",
        ],
      },
      {
        title: "14. Protección de datos personales",
        body: [
          "El tratamiento de tus datos personales se describe en la Política de Privacidad y en la Política de Cookies. Al utilizar el sitio aceptas dichos tratamientos en la medida informada y, cuando corresponda, consentida.",
        ],
      },
      {
        title: "15. Libro de reclamaciones y solución de controversias",
        body: [
          "Disponemos de un Libro de reclamaciones conforme a la Ley N.° 29571, accesible desde el enlace correspondiente en el sitio y en atención presencial.",
          "Te invitamos a contactarnos primero por WhatsApp o en tienda para resolver cualquier incidencia de forma directa. Si no obtienes respuesta satisfactoria, puedes acudir al Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual (Indecopi) u otras vías previstas por ley.",
          complaintPlazosTerminosReferencia(),
        ],
      },
      {
        title: "16. Ley aplicable y jurisdicción",
        body: [
          "Estos Términos y Condiciones se rigen por las leyes de la República del Perú.",
          "Cualquier controversia se someterá a los tribunales competentes del domicilio del consumidor o del lugar de cumplimiento de la obligación, según las normas de protección al consumidor y de competencia territorial aplicables.",
        ],
      },
      {
        title: "17. Modificaciones",
        body: [
          "Podemos actualizar estos Términos y Condiciones para reflejar cambios legales, comerciales o tecnológicos. La versión vigente estará publicada en esta página con su fecha de actualización.",
          "Los cambios no afectarán retroactivamente pedidos ya confirmados, salvo disposición legal imperativa. El uso continuado del sitio tras la publicación de cambios sustanciales implicará tu aceptación de la nueva versión.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Cuándo se confirma mi pedido?",
        answer:
          "Cuando el pago es aprobado por el proveedor de medios de pago o cuando validamos manualmente el método elegido. Recibirás confirmación con el número de pedido para seguimiento.",
      },
      {
        question: "¿Puedo cancelar un pedido después de pagar?",
        answer:
          "Puedes solicitarlo de inmediato por WhatsApp. Si el pedido no ha sido despachado, gestionamos la cancelación y el reembolso según el medio de pago. Si ya fue enviado, aplican las reglas de cambios y devoluciones.",
      },
      {
        question: "¿Qué hago si recibo un producto equivocado o defectuoso?",
        answer:
          "Contáctanos dentro del plazo indicado en Cambios y devoluciones, con fotos y número de pedido. Evaluamos reemplazo, cambio de talla o reembolso según corresponda y la normativa de consumo.",
      },
      {
        question: "¿Los precios incluyen IGV?",
        answer:
          "Sí, salvo que en la ficha del producto o en la campaña se indique expresamente lo contrario. El total a pagar se muestra en el resumen antes de confirmar la compra.",
      },
    ],
  },
  privacidad: {
    group: "legal",
    kicker: "Legal",
    title: "Política de privacidad",
    intro:
      "La presente Política de Privacidad regula el tratamiento de datos personales realizado por Calzatura Vilchez a través de su sitio web, aplicaciones asociadas y canales de atención vinculados a la compra en línea. Al utilizar nuestros servicios digitales, declaras haber leído y comprendido este documento. Si no estás de acuerdo con alguno de sus términos, te pedimos que no utilices el sitio o que te pongas en contacto con nosotros antes de registrarte o realizar un pedido.",
    accent: "Tratamiento conforme a la legislación peruana de protección de datos",
    note: "Última actualización: 26 de mayo de 2026. Marco normativo: Ley N.° 29733, D.S. N.° 003-2013-JUS y normas complementarias.",
    highlights: [
      "Alcance y responsable",
      "Finalidades y bases legales",
      "Derechos ARCO y reclamos",
    ],
    sections: [
      {
        title: "1. Alcance y ámbito de aplicación",
        body: [
          "Esta política aplica a toda persona natural que visite el sitio web de Calzatura Vilchez, cree una cuenta de usuario, agregue productos al carrito, realice pedidos, se comunique con nosotros por los canales digitales habilitados o ejerza sus derechos en materia de protección de datos personales.",
          "El tratamiento comprende las operaciones de recopilación, registro, organización, conservación, consulta, uso, comunicación, bloqueo, supresión y demás formas de tratamiento permitidas por la ley, siempre vinculadas a las finalidades descritas en el presente documento.",
          "Esta política no sustituye los Términos y Condiciones de compra ni la información específica sobre cookies, que se encuentra en documentos complementarios enlazados desde el pie de página del sitio.",
        ],
      },
      {
        title: "2. Responsable del tratamiento",
        body: [
          ...PROVIDER_ID_BODY,
          "Te recomendamos identificarte con tu nombre completo y, cuando corresponda, el correo electrónico asociado a tu cuenta, a fin de atender tu solicitud con la debida diligencia.",
        ],
      },
      {
        title: "3. Marco normativo",
        body: [
          "Tratamos datos personales de conformidad con la Ley N.° 29733, Ley de Protección de Datos Personales; su Reglamento aprobado por Decreto Supremo N.° 003-2013-JUS; las directivas y lineamientos de la Autoridad Nacional de Protección de Datos Personales (ANPDP); y, en lo que resulte aplicable, la Ley N.° 29571, Código de Protección y Defensa del Consumidor, respecto de la relación comercial.",
          "Cuando el tratamiento requiera tu consentimiento, este será libre, previo, expreso e informado. Puedes retirarlo en cualquier momento sin que ello afecte la licitud del tratamiento realizado con anterioridad, salvo disposición legal en contrario.",
        ],
      },
      {
        title: "4. Categorías de datos personales que tratamos",
        body: [
          "Datos identificativos: nombres y apellidos, número de documento nacional de identidad (DNI) u otro documento que acredite tu identidad cuando sea necesario para el registro o la atención de reclamos.",
          "Datos de contacto: correo electrónico, número de teléfono móvil o fijo y, en su caso, usuario o identificador asignado en la plataforma.",
          "Datos de transacción y comerciales: historial de pedidos, productos adquiridos, tallas, montos, cupones aplicados, estado del pedido, método de pago seleccionado y comprobantes asociados. No almacenamos los datos completos de tu tarjeta de crédito o débito; el procesamiento de pagos con tarjeta es realizado por el proveedor de pagos autorizado.",
          "Datos de entrega: dirección, distrito, provincia, departamento, referencias de ubicación y persona de contacto para la coordinación logística.",
          "Datos de navegación y técnicos: dirección IP, identificadores de sesión, tipo y versión del navegador, sistema operativo, zona horaria, páginas visitadas, tiempo de permanencia y eventos de interacción con el sitio, recogidos mediante cookies y tecnologías similares conforme a nuestra Política de cookies.",
          "Datos derivados de comunicaciones: contenido de mensajes que nos envíes por WhatsApp u otros canales habilitados, en la medida necesaria para atender consultas, reclamos o solicitudes vinculadas a un pedido.",
        ],
      },
      {
        title: "5. Origen de los datos",
        body: [
          "Los datos pueden obtenerse directamente de ti cuando completas formularios de registro, checkout, perfil de usuario o cuando nos contactas voluntariamente.",
          "También pueden generarse de forma automática durante tu navegación en el sitio, siempre dentro de los límites informados en esta política y en la Política de cookies.",
          "En casos excepcionales, y solo cuando la ley lo permita o tú lo autorices, podemos recibir información de terceros estrictamente necesarios para completar una transacción (por ejemplo, confirmación de pago por parte del procesador de tarjetas).",
        ],
      },
      {
        title: "6. Finalidades del tratamiento y base legal",
        body: [
          "Gestión de la relación contractual: crear y administrar tu cuenta, procesar pedidos, emitir confirmaciones, coordinar entregas, gestionar devoluciones o cambios y atender garantías. Base legal: ejecución del contrato o medidas precontractuales a tu solicitud.",
          "Atención al cliente y soporte postventa: responder consultas, reclamos y solicitudes presentadas por los canales habilitados. Base legal: ejecución del contrato, interés legítimo en mejorar el servicio u obligación legal, según el caso.",
          "Seguridad y prevención del fraude: verificar identidad en el registro, detectar usos indebidos, proteger la integridad del sitio y de los usuarios. Base legal: interés legítimo y, cuando corresponda, consentimiento para herramientas específicas de verificación.",
          "Cumplimiento normativo: conservar información exigida por normas tributarias, de defensa del consumidor o de protección de datos; atender requerimientos de autoridad competente. Base legal: obligación legal.",
          "Comunicaciones comerciales: envío de novedades, promociones o recordatorios de carrito abandonado, únicamente si has otorgado consentimiento expreso o si existe una relación previa y la comunicación se ajusta a la normativa aplicable. Base legal: consentimiento, revocable en cualquier momento.",
          "Mejora del servicio digital: análisis agregado o interno del uso del sitio para optimizar catálogo, rendimiento y experiencia de compra, sin perjuicio de las categorías de cookies que hayas autorizado. Base legal: consentimiento o interés legítimo, según la naturaleza del tratamiento.",
        ],
      },
      {
        title: "7. Plazos de conservación",
        body: [
          "Los datos de tu cuenta se conservan mientras mantengas el registro activo. Tras la solicitud de baja, procederemos a la supresión o anonimización del perfil en un plazo razonable, generalmente no superior a treinta (30) días calendario, salvo obligación de conservación.",
          "Los datos vinculados a pedidos y facturación se conservan durante el plazo necesario para cumplir obligaciones comerciales, tributarias y de garantía, que puede extenderse hasta diez (10) años o el plazo que establezca la normativa vigente en cada materia.",
          "Los registros de seguridad, acceso y auditoría se conservan por períodos limitados, habitualmente entre seis (6) y veinticuatro (24) meses, salvo que un incidente justifique una conservación mayor hasta su resolución.",
          "Los datos tratados con base en consentimiento (por ejemplo, comunicaciones comerciales o cookies no esenciales) se conservan hasta que revoques tu consentimiento o solicites su supresión, sin perjuicio de la conservación bloqueada que exija la ley.",
        ],
      },
      {
        title: "8. Destinatarios, encargados y comunicaciones",
        body: [
          "Podemos comunicar datos personales a encargados de tratamiento que nos prestan servicios estrictamente necesarios para operar la tienda en línea, tales como: procesamiento de pagos con tarjeta; servicios de autenticación y alojamiento en la nube; almacenamiento de archivos e imágenes; mensajería y notificaciones; servicios de mapas o geolocalización para el cálculo de envíos; y asesoría legal o contable cuando sea indispensable.",
          "Todos los encargados actúan bajo nuestras instrucciones, con obligaciones contractuales de confidencialidad y seguridad acordes a la normativa de protección de datos.",
          "Podremos comunicar datos a autoridades administrativas, judiciales o policiales cuando exista mandato legal, requerimiento fundado o necesidad de defender derechos en un procedimiento.",
          "No vendemos, cedemos ni alquilamos bases de datos personales a terceros con fines de marketing ajeno a Calzatura Vilchez.",
        ],
      },
      {
        title: "9. Transferencias internacionales",
        body: [
          "Algunos proveedores tecnológicos pueden alojar o tratar información en servidores ubicados fuera del Perú, incluidos países de América del Norte, Europa o Latinoamérica.",
          "Cuando ello ocurra, adoptamos medidas contractuales y organizativas razonables para garantizar un nivel de protección adecuado, tales como cláusulas de confidencialidad, evaluación del proveedor y limitación de finalidades.",
          "Al utilizar el sitio y, en su caso, otorgar tu consentimiento para categorías específicas de cookies o servicios, reconoces que dichas transferencias pueden producirse en los términos descritos.",
        ],
      },
      {
        title: "10. Medidas de seguridad",
        body: [
          "Implementamos medidas técnicas y organizativas orientadas a proteger la confidencialidad, integridad y disponibilidad de los datos personales, incluyendo controles de acceso, cifrado en tránsito cuando corresponda, políticas de contraseñas, segregación de entornos y procedimientos de respuesta ante incidentes.",
          "El acceso a datos personales se limita al personal y proveedores que lo requieran para el desempeño de sus funciones, sujetos a deber de confidencialidad.",
          "Ningún sistema es completamente infalible. Si detectamos un incidente de seguridad que pueda afectar tus derechos, actuaremos conforme a los procedimientos legales aplicables, incluida la notificación a la autoridad o a los titulares cuando corresponda.",
        ],
      },
      {
        title: "11. Decisiones automatizadas y elaboración de perfiles",
        body: [
          "No adoptamos decisiones que produzcan efectos jurídicos sobre ti basadas únicamente en tratamientos automatizados, salvo autorización expresa o cuando la ley lo permita.",
          "Podemos utilizar reglas automatizadas de carácter técnico (por ejemplo, detección de intentos de registro masivo o validaciones de seguridad) sin que ello implique una evaluación de tu solvencia, personalidad o comportamiento fuera del ámbito descrito en esta política.",
        ],
      },
      {
        title: "12. Comunicaciones comerciales",
        body: [
          "Solo te enviaremos publicidad, promociones o boletines informativos si has marcado la casilla de aceptación correspondiente en el registro o si has solicitado expresamente recibir dichas comunicaciones.",
          "Cada mensaje comercial incluirá un mecanismo sencillo para darte de baja (por ejemplo, responder con la palabra «BAJA» o utilizar el enlace de cancelación cuando esté disponible).",
          "La revocación del consentimiento para marketing no afecta el envío de comunicaciones estrictamente necesarias relacionadas con tus pedidos (confirmaciones, estados de envío o respuestas a reclamos).",
        ],
      },
      {
        title: "13. Ejercicio de tus derechos",
        body: [
          "Como titular de datos personales tienes derecho de acceso, rectificación, cancelación, oposición, revocación del consentimiento, portabilidad cuando sea técnicamente posible, y a no ser objeto de decisiones automatizadas en los términos previstos por ley.",
          "Puedes actualizar tu número de teléfono desde la sección Mi perfil. Para solicitar la eliminación de tu cuenta, utiliza la opción habilitada en el perfil o escríbenos por los canales de contacto indicados.",
          "Para ejercer cualquier otro derecho, envía una solicitud clara indicando el derecho que deseas ejercer, tus datos de identificación y, de ser posible, el motivo o alcance de la petición. Podremos solicitarte información adicional razonable para verificar tu identidad.",
          "Atenderemos tu solicitud en un plazo máximo de quince (15) días hábiles, prorrogable por quince (15) días hábiles adicionales cuando existan causas justificadas, informándote previamente conforme al artículo 20 del Reglamento de la Ley N.° 29733.",
          "El ejercicio de tus derechos es gratuito, salvo solicitudes manifiestamente infundadas o repetitivas que puedan generar costos administrativos desproporcionados.",
        ],
      },
      {
        title: "14. Reclamo ante la autoridad de protección de datos",
        body: [
          "Si consideras que el tratamiento de tus datos personales vulnera la normativa vigente o que no hemos atendido adecuadamente tu solicitud, puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales (ANPDP), órgano desconcentrado del Ministerio de Justicia y Derechos Humanos.",
          "Mesa de Partes: Calle Scipión Llona N.° 350, Miraflores, Lima, Perú. Horario de atención conforme a la información publicada en el portal oficial del Ministerio de Justicia y Derechos Humanos.",
        ],
      },
      {
        title: "15. Menores de edad",
        body: [
          "Los servicios de compra en línea están dirigidos a personas mayores de dieciocho (18) años. No recopilamos intencionalmente datos de menores de edad.",
          "Si eres padre, madre o tutor legal y consideras que un menor nos ha proporcionado datos personales sin autorización, contáctanos para proceder a su supresión en la medida de lo posible.",
        ],
      },
      {
        title: "16. Enlaces a sitios de terceros",
        body: [
          "Nuestro sitio puede contener enlaces a redes sociales, mapas u otros sitios externos. No somos responsables de las políticas de privacidad de dichos terceros. Te recomendamos leer sus condiciones antes de facilitarles datos personales.",
        ],
      },
      {
        title: "17. Modificaciones de esta política",
        body: [
          "Nos reservamos el derecho de modificar esta Política de Privacidad para adaptarla a cambios normativos, tecnológicos o de nuestros servicios. La versión vigente estará siempre publicada en esta página con indicación de la fecha de última actualización.",
          "Cuando los cambios sean sustanciales y afecten el tratamiento basado en consentimiento, te informaremos por medios razonables (aviso en el sitio, correo electrónico u otro canal de contacto) para que puedas revisar la nueva versión.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Calzatura Vilchez vende o alquila mis datos personales?",
        answer:
          "No. No comercializamos bases de datos personales. Solo compartimos información con encargados que nos ayudan a operar la tienda en línea, bajo contrato y con fines limitados.",
      },
      {
        question: "¿Cómo solicito la eliminación de mi cuenta y datos?",
        answer:
          "Puedes hacerlo desde Mi perfil con la opción Eliminar cuenta, o escribirnos por WhatsApp indicando tu correo registrado. Conservaremos únicamente la información que debamos mantener por obligación legal o para atender reclamos o garantías pendientes.",
      },
      {
        question: "¿Cuánto demora la respuesta a una solicitud ARCO?",
        answer:
          "El plazo general es de quince (15) días hábiles desde la recepción de tu solicitud completa. En casos complejos podemos ampliarlo quince (15) días hábiles más, informándote previamente.",
      },
      {
        question: "¿Necesito aceptar publicidad para comprar?",
        answer:
          "No. Las comunicaciones comerciales son opcionales. Puedes comprar sin aceptar marketing; solo necesitas los datos indispensables para el pedido y, en su caso, las cookies o autorizaciones técnicas descritas en la Política de cookies.",
      },
    ],
  },
  politicaCookies: {
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
    sections: [
      {
        title: "1. ¿Qué son las cookies y tecnologías similares?",
        body: [
          "Las cookies son pequeños archivos de texto que un sitio web almacena en tu ordenador, tableta o teléfono móvil cuando lo visitas. Permiten, entre otras cosas, que el sitio recuerde tus acciones y preferencias durante un periodo de tiempo, de modo que no tengas que volver a configurarlas cada vez que regreses o navegues de una página a otra.",
          "Además de cookies, utilizamos tecnologías equivalentes de almacenamiento local en el navegador (por ejemplo, almacenamiento de sesión o almacenamiento persistente) cuando resulta necesario para el funcionamiento del carrito, la sesión de usuario o tus preferencias de visualización.",
          "Las cookies pueden ser de sesión (se eliminan al cerrar el navegador) o persistentes (permanecen hasta su fecha de caducidad o hasta que las borres manualmente).",
        ],
      },
      {
        title: "2. ¿Quién utiliza las cookies?",
        body: [
          "Cookies propias: instaladas y gestionadas directamente por Calzatura Vilchez o en nuestro nombre, para operar la tienda en línea.",
          "Cookies de terceros: instaladas por proveedores que nos prestan servicios necesarios, como procesamiento de pagos, autenticación de usuarios, protección contra tráfico malicioso o alojamiento del sitio. Estos terceros actúan como encargados o responsables independientes según su propia política, dentro de los límites de nuestras instrucciones contractuales.",
        ],
      },
      {
        title: "3. Relación con datos personales",
        body: [
          "Algunas cookies pueden recopilar o asociarse con identificadores que, combinados con otros datos, permiten identificarte. En esos casos, el tratamiento se considera tratamiento de datos personales y se rige por la Ley N.° 29733 y su Reglamento, además de por esta política y por nuestra Política de privacidad.",
          "La información obtenida a través de cookies no esenciales solo se utilizará para las finalidades descritas en el panel de consentimiento y en el inventario de la sección 10.",
        ],
      },
      {
        title: "4. Base legal del tratamiento",
        body: [
          "Las cookies estrictamente necesarias se fundamentan en la necesidad de ejecutar el servicio solicitado por el usuario y en el interés legítimo de garantizar la seguridad y estabilidad del sitio.",
          "Las cookies funcionales, de seguridad y, en su caso, de medición o marketing, se activan con base en tu consentimiento libre, específico e informado, otorgado mediante el banner o el panel de configuración de cookies.",
          "Puedes retirar tu consentimiento en cualquier momento sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada, en los términos permitidos por la ley.",
        ],
      },
      {
        title: "5. Cómo otorgar, rechazar o modificar tu consentimiento",
        body: [
          "Al acceder por primera vez al sitio se muestra un aviso de cookies con tres opciones principales: aceptar todas las categorías disponibles, limitar el uso a las estrictamente necesarias, o abrir la configuración detallada para activar o desactivar cada categoría de forma individual.",
          "Puedes cambiar tu decisión en cualquier momento haciendo clic en el enlace «Configuración de cookies» ubicado en el pie de página del sitio.",
          "Si rechazas las cookies funcionales o de seguridad, podrás seguir consultando el catálogo de productos, pero es posible que no puedas registrarte, iniciar sesión, guardar el carrito entre visitas o completar un pago en línea hasta que autorices las categorías necesarias para esas funciones.",
          "La retirada del consentimiento no obliga a borrar automáticamente cookies ya instaladas; deberás eliminarlas desde la configuración de tu navegador si deseas suprimirlas de inmediato.",
        ],
      },
      {
        title: "6. Gestión de cookies desde tu navegador",
        body: [
          "Puedes configurar tu navegador para bloquear, alertar sobre o eliminar cookies. Los pasos varían según el programa que utilices. A título orientativo, consulta la sección de ayuda de tu navegador o las páginas de soporte de Chrome, Firefox, Safari, Microsoft Edge u Opera.",
          "Si bloqueas todas las cookies, incluidas las necesarias, es probable que algunas secciones del sitio no funcionen correctamente o que debas introducir tus datos en cada visita.",
          "El modo de navegación privada o incógnito limita la persistencia de cookies, pero no sustituye al panel de consentimiento de Calzatura Vilchez para las categorías que requieren autorización expresa.",
        ],
      },
      {
        title: "7. Plazos de conservación",
        body: [
          "Cada cookie o tecnología similar tiene un periodo de conservación determinado según su finalidad, que puede ir desde la duración de tu sesión de navegación hasta varios meses, como se indica en el inventario detallado de la siguiente sección.",
          "Tu elección de consentimiento se conserva durante un plazo máximo de doce (12) meses, tras el cual te solicitaremos nuevamente tu preferencia si accedes al sitio.",
        ],
      },
      {
        title: "8. Ejercicio de derechos y reclamos",
        body: [
          "Puedes ejercer los derechos de acceso, rectificación, cancelación, oposición y revocación del consentimiento respecto de los datos personales tratados mediante cookies, dirigiéndote a los canales indicados en nuestra Política de privacidad (WhatsApp +51 964 052 530 o atención en tienda).",
          "Responderemos en el plazo máximo de quince (15) días hábiles, con las prórrogas que permita la ley.",
          "Si consideras que tus derechos no han sido atendidos, puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales (ANPDP), Mesa de Partes del Ministerio de Justicia y Derechos Humanos, Calle Scipión Llona N.° 350, Miraflores, Lima.",
        ],
      },
      {
        title: "9. Actualizaciones de esta política",
        body: [
          "Podemos modificar esta Política de Cookies cuando incorporemos nuevas funcionalidades, cambien los proveedores que utilizamos o se actualice la normativa aplicable. Publicaremos la versión vigente en esta página e indicaremos la fecha de última actualización.",
          "Cuando el cambio implique nuevas categorías de cookies o finalidades que requieran consentimiento, te solicitaremos de nuevo tu autorización mediante el banner o el panel de configuración.",
        ],
      },
    ],
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
  },
  libroReclamaciones: {
    group: "legal",
    kicker: "Legal",
    title: "Libro de reclamaciones",
    intro:
      "Conforme a la Ley N.° 29571, Calzatura Vilchez dispone de libro de reclamaciones físico en tienda y canales de atención en línea. Puedes presentar tu hoja de forma presencial, por WhatsApp o, si lo prefieres, mediante el formulario virtual.",
    accent: complaintPlazosInfoPageAccent(),
    note: "Última actualización: 26 de mayo de 2026. También puedes acudir a Indecopi si lo consideras necesario.",
    highlights: [],
    sections: [
      {
        title: "1. Proveedor y canales",
        body: [
          ...PROVIDER_ID_BODY,
          "La forma más habitual es solicitar la hoja impresa en tienda o escribirnos por WhatsApp. El formulario web registra la hoja en nuestro libro virtual con código de referencia.",
        ],
      },
      {
        title: "2. Reclamo y queja",
        body: [
          "Reclamo: disconformidad con el producto o servicio (defecto, talla errónea, cobro indebido, demora de entrega, etc.).",
          "Queja: disconformidad con la atención recibida. Ambos se tramitan de la misma forma.",
        ],
      },
      {
        title: "3. Plazos y costo",
        body: [...complaintPlazosInfoPageBody()],
      },
      {
        title: "4. Indecopi",
        body: [
          "Presentar una hoja aquí no impide acudir a Indecopi (www.indecopi.gob.pe) u otras vías de defensa del consumidor.",
        ],
      },
      {
        title: "5. Presentar tu hoja",
        body: [
          "Elige el canal que te resulte más cómodo. No es obligatorio usar el formulario web.",
        ],
      },
    ],
    faq: [],
  },
};

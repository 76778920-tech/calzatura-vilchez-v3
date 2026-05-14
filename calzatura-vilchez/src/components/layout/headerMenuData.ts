import { buildCatalogHref, buildCyberCatalogHref } from "@/routes/catalogRouting";
import trendNuevaTemporada from "@/assets/home/trends/trend-nueva-temporada-ai.png";
import trendPasosRadiantes from "@/assets/home/trends/trend-pasos-radiantes-ai.png";
import trendUrbanGlow from "@/assets/home/trends/trend-urban-glow-ai.png";
import trendSunsetChic from "@/assets/home/trends/trend-sunset-chic-ai.png";
import cyberHombreEditorial from "@/assets/home/cyber/cyber-hombre-editorial.png";
import cyberMujerEditorial from "@/assets/home/cyber/cyber-mujer-editorial.png";
import cyberInfantilEditorial from "@/assets/home/cyber/cyber-infantil-editorial.png";
import cyberZapatillasEditorial from "@/assets/home/cyber/cyber-zapatillas-editorial.png";
import type { MegaMenu } from "@/components/layout/headerMegaMenuTypes";

export const WHATSAPP_CONTACT_URL =
  "https://wa.me/51964052530?text=Hola%20Calzatura%20Vilchez%2C%20quiero%20hacer%20una%20consulta%20sobre%20sus%20calzados.";

function buildProductsRoute(params: Record<string, string | undefined>) {
  return buildCatalogHref(params);
}

function buildBrandRoute(brand: string) {
  const slug = brand
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .replaceAll("+", " ")
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return buildProductsRoute({ vista: "marcas", marcaSlug: slug });
}

function buildZapatillasFeatured(cat: string, label: string) {
  return {
    label: `Zapatillas ${label}`,
    to: buildProductsRoute({ categoria: cat, tipo: "zapatillas" }),
    tag: "+ Estilos",
    hoverPanel: {
      eyebrow: `ZAPATILLAS ${label.toUpperCase()}`,
      items: [
        { label: "Urbanas", to: buildProductsRoute({ categoria: cat, tipo: "zapatillas", estilo: "urbanas" }) },
        { label: "Deportivas", to: buildProductsRoute({ categoria: cat, tipo: "zapatillas", estilo: "deportivas" }) },
        { label: "Casuales", to: buildProductsRoute({ categoria: cat, tipo: "zapatillas", estilo: "casuales" }) },
        { label: "Outdoor", to: buildProductsRoute({ categoria: cat, tipo: "zapatillas", estilo: "outdoor" }) },
        { label: "Ver Todo", to: buildProductsRoute({ categoria: cat, tipo: "zapatillas" }) },
      ],
    },
  };
}

export const megaMenus: MegaMenu[] = [
  {
    id: "cyber",
    label: "CYBER WOW",
    featured: [
      {
        label: "Cyber Hombre",
        to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber" }),
        accent: true,
        hoverPanel: {
          eyebrow: "CYBER HOMBRE",
          layout: "list",
          items: [
            { label: "Zapatillas Cyber", to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber", tipo: "zapatillas" }), image: cyberHombreEditorial },
            { label: "Zapatos Cyber", to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber", tipo: "zapatos" }), image: cyberHombreEditorial },
            { label: "Botines Cyber", to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber", tipo: "botines" }), image: cyberHombreEditorial },
            { label: "Ver Todo", to: buildCyberCatalogHref({ categoria: "hombre", campana: "cyber" }), image: cyberHombreEditorial },
          ],
        },
      },
      {
        label: "Cyber Mujer",
        to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" }),
        hoverPanel: {
          eyebrow: "CYBER MUJER",
          layout: "list",
          items: [
            { label: "Zapatillas Cyber", to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber", tipo: "zapatillas" }), image: cyberMujerEditorial },
            { label: "Sandalias Cyber", to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber", tipo: "sandalias" }), image: cyberMujerEditorial },
            { label: "Botines Cyber", to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber", tipo: "botines" }), image: cyberMujerEditorial },
            { label: "Ver Todo", to: buildCyberCatalogHref({ categoria: "mujer", campana: "cyber" }), image: cyberMujerEditorial },
          ],
        },
      },
      {
        label: "Cyber Infantil",
        to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", segmento: "infantil" }),
        hoverPanel: {
          eyebrow: "CYBER INFANTIL",
          layout: "list",
          items: [
            { label: "Escolar Cyber", to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", tipo: "escolar" }), image: cyberInfantilEditorial },
            { label: "Juvenil Activo", to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", segmento: "juvenil" }), image: cyberInfantilEditorial },
            { label: "Zapatillas Cyber", to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber", tipo: "zapatillas" }), image: cyberInfantilEditorial },
            { label: "Ver Todo", to: buildCyberCatalogHref({ categoria: "nino", campana: "cyber" }), image: cyberInfantilEditorial },
          ],
        },
      },
      {
        label: "Cyber Zapatillas",
        to: buildCyberCatalogHref({ linea: "zapatillas", campana: "cyber" }),
        hoverPanel: {
          eyebrow: "CYBER ZAPATILLAS",
          layout: "list",
          items: [
            { label: "Mujer", to: buildCyberCatalogHref({ categoria: "mujer", tipo: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
            { label: "Hombre", to: buildCyberCatalogHref({ categoria: "hombre", tipo: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
            { label: "Niños", to: buildCyberCatalogHref({ categoria: "nino", tipo: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
            { label: "Ver Todo", to: buildCyberCatalogHref({ linea: "zapatillas", campana: "cyber" }), image: cyberZapatillasEditorial },
          ],
        },
      },
    ],
    columns: [],
  },
  {
    id: "mujer",
    label: "Mujer",
    featured: [
      {
        label: "Nuevas Tendencias",
        to: buildProductsRoute({ categoria: "mujer", campana: "nueva-temporada" }),
        hoverPanel: {
          eyebrow: "NEW & TRENDING",
          items: [
            { label: "Nueva Temporada", to: buildProductsRoute({ categoria: "mujer", campana: "nueva-temporada" }), image: trendNuevaTemporada },
            { label: "Pasos Radiantes", to: buildProductsRoute({ categoria: "mujer", coleccion: "pasos-radiantes" }), image: trendPasosRadiantes },
            { label: "Urban Glow", to: buildProductsRoute({ categoria: "mujer", coleccion: "urban-glow" }), image: trendUrbanGlow },
            { label: "Sunset Chic", to: buildProductsRoute({ categoria: "mujer", coleccion: "sunset-chic" }), image: trendSunsetChic },
          ],
        },
      },
      { label: "Calzado Mujer", to: buildProductsRoute({ categoria: "mujer" }), accent: true },
      { label: "Marcas", to: buildProductsRoute({ vista: "marcas" }) },
    ],
    columns: [
      {
        title: "CALZADO MUJER",
        links: [
          { label: "Zapatillas", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas" }) },
          { label: "Sandalias", to: buildProductsRoute({ categoria: "mujer", tipo: "sandalias" }) },
          { label: "Zapatos Casuales", to: buildProductsRoute({ categoria: "mujer", tipo: "casual" }) },
          { label: "Zapatos de Vestir", to: buildProductsRoute({ categoria: "mujer", tipo: "formal" }) },
          { label: "Mocasines", to: buildProductsRoute({ categoria: "mujer", tipo: "mocasines" }) },
          { label: "Botas y Botines", to: buildProductsRoute({ categoria: "mujer", tipo: "botas" }) },
          { label: "Ballerinas", to: buildProductsRoute({ categoria: "mujer", tipo: "ballerinas" }) },
          { label: "Pantuflas", to: buildProductsRoute({ categoria: "mujer", tipo: "pantuflas" }) },
          { label: "Flip Flops", to: buildProductsRoute({ categoria: "mujer", tipo: "flip-flops" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "mujer" }) },
        ],
      },
    ],
    promo: {
      eyebrow: "NEW ARRIVALS",
      title: "Essential Summer",
      subtitle: "Mujer",
      to: buildProductsRoute({ categoria: "mujer" }),
    },
  },
  {
    id: "hombre",
    label: "Hombre",
    featured: [
      {
        label: "Nuevas Tendencias",
        to: buildProductsRoute({ categoria: "hombre", campana: "nueva-temporada" }),
        hoverPanel: {
          eyebrow: "NEW & TRENDING",
          items: [
            { label: "Nueva Temporada", to: buildProductsRoute({ categoria: "hombre", campana: "nueva-temporada" }) },
            { label: "Ruta Urbana", to: buildProductsRoute({ categoria: "hombre", coleccion: "ruta-urbana" }) },
            { label: "Paso Ejecutivo", to: buildProductsRoute({ categoria: "hombre", coleccion: "paso-ejecutivo" }) },
            { label: "Weekend Flow", to: buildProductsRoute({ categoria: "hombre", coleccion: "weekend-flow" }) },
          ],
        },
      },
      {
        label: "Calzado Hombre",
        to: buildProductsRoute({ categoria: "hombre" }),
        accent: true,
      },
      {
        label: "Marcas",
        to: buildProductsRoute({ vista: "marcas" }),
        hoverPanel: {
          eyebrow: "MARCAS",
          items: [
            { label: "Calzatura Vilchez", to: buildBrandRoute("Calzatura Vilchez") },
            { label: "Bata", to: buildBrandRoute("Bata") },
            { label: "Clarks", to: buildBrandRoute("Clarks") },
            { label: "Adidas", to: buildBrandRoute("Adidas") },
          ],
        },
      },
    ],
    columns: [
      {
        title: "CALZADO HOMBRE",
        links: [
          { label: "Zapatillas", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas" }) },
          { label: "Zapatos de Vestir", to: buildProductsRoute({ categoria: "hombre", tipo: "formal" }) },
          { label: "Zapatos Casuales", to: buildProductsRoute({ categoria: "hombre", tipo: "casual" }) },
          { label: "Sandalias", to: buildProductsRoute({ categoria: "hombre", tipo: "sandalias" }) },
          { label: "Botines", to: buildProductsRoute({ categoria: "hombre", tipo: "botines" }) },
          { label: "Zapatos de Seguridad", to: buildProductsRoute({ categoria: "hombre", tipo: "seguridad" }) },
          { label: "Pantuflas", to: buildProductsRoute({ categoria: "hombre", tipo: "pantuflas" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "hombre" }) },
        ],
      },
    ],
    promo: {
      eyebrow: "NUEVA COLECCIÓN",
      title: "Urban Classics",
      subtitle: "Hombre",
      to: buildProductsRoute({ categoria: "hombre" }),
    },
  },
  {
    id: "infantil",
    label: "Infantil",
    featured: [
      {
        label: "Nuevas Tendencias",
        to: buildProductsRoute({ categoria: "nino", campana: "nueva-temporada" }),
        hoverPanel: {
          eyebrow: "NEW & TRENDING",
          items: [
            { label: "Nueva Temporada", to: buildProductsRoute({ categoria: "nino", campana: "nueva-temporada" }) },
            { label: "Vuelta al Cole", to: buildProductsRoute({ categoria: "nino", coleccion: "vuelta-al-cole" }) },
            { label: "Paso Activo", to: buildProductsRoute({ categoria: "nino", tipo: "zapatillas" }) },
            { label: "Mini Aventuras", to: buildProductsRoute({ categoria: "nino", coleccion: "mini-aventuras" }) },
          ],
        },
      },
      {
        label: "Niños",
        to: buildProductsRoute({ categoria: "nino", segmento: "ninos" }),
        accent: true,
        hoverPanel: {
          eyebrow: "NIÑOS",
          layout: "list",
          items: [
            { label: "Infantil 1-3 Años", to: buildProductsRoute({ categoria: "nino", rangoEdad: "1-3" }) },
            { label: "Niños 4-6 años", to: buildProductsRoute({ categoria: "nino", segmento: "ninos" }) },
            { label: "Junior 7-10 Años", to: buildProductsRoute({ categoria: "nino", segmento: "junior" }) },
            { label: "Accesorios", to: buildProductsRoute({ categoria: "nino", tipo: "accesorios" }) },
            { label: "Zapatos", to: buildProductsRoute({ categoria: "nino", tipo: "zapatos" }) },
            { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino" }) },
          ],
        },
      },
      {
        label: "Niñas",
        to: buildProductsRoute({ categoria: "nino", segmento: "ninas" }),
        hoverPanel: {
          eyebrow: "NIÑAS",
          layout: "list",
          items: [
            { label: "Escolar", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "escolar" }) },
            { label: "Zapatillas", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "zapatillas" }) },
            { label: "Ballerinas", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "ballerinas" }) },
            { label: "Botas y Botines", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "botas" }) },
            { label: "Sandalias", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "sandalias" }) },
            { label: "Zapatos", to: buildProductsRoute({ categoria: "nino", segmento: "ninas", tipo: "zapatos" }) },
            { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino", segmento: "ninas" }) },
          ],
        },
      },
      {
        label: "Marcas",
        to: buildProductsRoute({ vista: "marcas" }),
        hoverPanel: {
          eyebrow: "MARCAS",
          items: [
            { label: "Calzatura Vilchez", to: buildBrandRoute("Calzatura Vilchez") },
            { label: "Bata", to: buildBrandRoute("Bata") },
            { label: "Platanitos", to: buildBrandRoute("Platanitos") },
            { label: "Adidas", to: buildBrandRoute("Adidas") },
          ],
        },
      },
    ],
    columns: [
      {
        title: "CALZADO NIÑO",
        links: [
          { label: "Escolar", to: buildProductsRoute({ categoria: "nino", tipo: "escolar" }) },
          { label: "Sandalias", to: buildProductsRoute({ categoria: "nino", tipo: "sandalias" }) },
          { label: "Zapatillas", to: buildProductsRoute({ categoria: "nino", tipo: "zapatillas" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino" }) },
        ],
      },
      {
        title: "NIÑO",
        links: [
          { label: "Infantil 1-3 Años", to: buildProductsRoute({ categoria: "nino", rangoEdad: "1-3" }) },
          { label: "Niños 4-6 años", to: buildProductsRoute({ categoria: "nino", segmento: "ninos" }) },
          { label: "Junior 7-10 Años", to: buildProductsRoute({ categoria: "nino", segmento: "junior" }) },
          { label: "Accesorios", to: buildProductsRoute({ categoria: "nino", tipo: "accesorios" }) },
          { label: "Zapatos", to: buildProductsRoute({ categoria: "nino", tipo: "zapatos" }) },
          { label: "Ver Todo", to: buildProductsRoute({ categoria: "nino" }) },
        ],
      },
    ],
    promo: {
      eyebrow: "KIDS",
      title: "Listos para jugar",
      subtitle: "Infantil",
      to: buildProductsRoute({ categoria: "nino" }),
    },
  },
  {
    id: "zapatillas",
    label: "Zapatillas",
    featured: [
      buildZapatillasFeatured("mujer", "Mujer"),
      buildZapatillasFeatured("hombre", "Hombre"),
      {
        label: "Zapatillas Blancas",
        to: buildProductsRoute({ linea: "zapatillas", color: "blanco" }),
        tag: "+ Buscadas",
        hoverPanel: {
          eyebrow: "ZAPATILLAS BLANCAS",
          items: [
            { label: "Mujer", to: buildProductsRoute({ categoria: "mujer", tipo: "zapatillas", color: "blanco" }) },
            { label: "Hombre", to: buildProductsRoute({ categoria: "hombre", tipo: "zapatillas", color: "blanco" }) },
            { label: "Niños", to: buildProductsRoute({ categoria: "nino", tipo: "zapatillas", color: "blanco" }) },
            { label: "Juvenil", to: buildProductsRoute({ categoria: "nino", segmento: "juvenil", tipo: "zapatillas", color: "blanco" }) },
          ],
        },
      },
    ],
    columns: [],
  },
  {
    id: "marcas",
    label: "Marcas",
    featured: [
      { label: "Calzatura Vilchez", to: buildBrandRoute("Calzatura Vilchez"), accent: true },
      { label: "Nuevas Marcas", to: buildProductsRoute({ vista: "marcas" }) },
      { label: "Más Vendidas", to: buildProductsRoute({ promocion: "destacados" }) },
    ],
    columns: [
      {
        title: "MARCAS",
        links: [
          { label: "Todas las marcas", to: buildProductsRoute({ vista: "marcas" }) },
          { label: "Dama", to: buildProductsRoute({ categoria: "mujer" }) },
          { label: "Hombre", to: buildProductsRoute({ categoria: "hombre" }) },
          { label: "Infantil", to: buildProductsRoute({ categoria: "nino" }) },
          { label: "Ver Todo", to: buildProductsRoute({}) },
        ],
      },
    ],
    promo: {
      eyebrow: "BRANDS",
      title: "Selección premium",
      subtitle: "Marcas",
      to: buildProductsRoute({ vista: "marcas" }),
    },
  },
];

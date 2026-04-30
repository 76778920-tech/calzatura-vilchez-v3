// @ts-nocheck — `cursor/canvas` solo existe en el runtime del Canvas de Cursor, no en el build de Vite.
import { Callout, Divider, H1, H2, Pill, Row, Stack, Stat, Table, Text } from "cursor/canvas";

const rows: string[][] = [
  ["CYBER WOW", "Cyber Hombre", "/productos?categoria=hombre&buscar=cyber", "Depende de texto libre 'cyber'", "/productos?categoria=hombre&campana=cyber", "Mejorar"],
  ["CYBER WOW", "Cyber Mujer", "/productos?categoria=mujer&buscar=cyber", "Depende de texto libre 'cyber'", "/productos?categoria=mujer&campana=cyber", "Mejorar"],
  ["CYBER WOW", "Cyber Infantil", "/productos?categoria=nino&buscar=cyber", "Categoria unica para ninos/ninas/junior", "/productos?categoria=nino&campana=cyber&segmento=infantil", "Mejorar"],
  ["CYBER WOW", "Cyber Zapatillas", "/productos?buscar=zapatillas cyber", "No fija categoria y mezcla intencion", "/productos?linea=zapatillas&campana=cyber", "Mejorar"],
  ["CYBER WOW", "Destacados", "/productos?buscar=destacado", "Se interpreta por keyword, no por flag explicita", "/productos?promocion=destacados", "Mejorar"],
  ["CYBER WOW", "Zapatillas en oferta", "/productos?buscar=zapatillas oferta", "Filtro ambiguo: texto + oferta", "/productos?linea=zapatillas&promocion=oferta", "Mejorar"],
  ["Mujer", "Nueva Temporada", "/productos?categoria=mujer&buscar=nueva temporada", "Campana modelada como busqueda", "/productos?categoria=mujer&campana=nueva-temporada", "Mejorar"],
  ["Mujer", "Pasos Radiantes", "/productos?categoria=mujer&buscar=pasos radiantes", "Coleccion editorial sin taxonomia", "/productos?categoria=mujer&coleccion=pasos-radiantes", "Mejorar"],
  ["Mujer", "Urban Glow", "/productos?categoria=mujer&buscar=urban glow", "Coleccion editorial sin taxonomia", "/productos?categoria=mujer&coleccion=urban-glow", "Mejorar"],
  ["Mujer", "Sunset Chic", "/productos?categoria=mujer&buscar=sunset chic", "Coleccion editorial sin taxonomia", "/productos?categoria=mujer&coleccion=sunset-chic", "Mejorar"],
  ["Mujer", "Calzado Mujer / Ver Todo", "/productos?categoria=mujer", "Solida, alineada al filtro real", "/productos?categoria=mujer", "Mantener"],
  ["Mujer", "Tipos (zapatillas/sandalias/formal/casual...)", "/productos?categoria=mujer&buscar=<tipo>", "Hoy funciona por coincidencia textual", "/productos?categoria=mujer&tipo=<slug>", "Mejorar"],
  ["Hombre", "Nuevas Tendencias", "/productos?categoria=hombre", "Duplica objetivo de 'Calzado Hombre'", "/productos?categoria=hombre&vista=tendencias", "Quitar o redefinir"],
  ["Hombre", "Ruta Urbana / Paso Ejecutivo / Weekend Flow", "/productos?categoria=hombre&buscar=urbano|formal|casual", "Terminos de marketing mezclados con tipos", "/productos?categoria=hombre&estilo=urbano|ejecutivo|weekend", "Mejorar"],
  ["Hombre", "Calzado Hombre / Ver Todo", "/productos?categoria=hombre", "Solida, alineada al filtro real", "/productos?categoria=hombre", "Mantener"],
  ["Infantil", "Ninos", "/productos?categoria=nino&buscar=ninos", "No diferencia genero/edad de forma canonica", "/productos?categoria=nino&segmento=ninos", "Mejorar"],
  ["Infantil", "Ninas", "/productos?categoria=nino&buscar=ninas", "No diferencia genero/edad de forma canonica", "/productos?categoria=nino&segmento=ninas", "Mejorar"],
  ["Infantil", "Junior 7-10", "/productos?categoria=nino&buscar=junior", "Junior como keyword, sin control de rango", "/productos?categoria=nino&segmento=junior", "Mejorar"],
  ["Infantil", "Infantil 1-3", "/productos?categoria=nino&buscar=infantil", "Etiqueta de edad via texto libre", "/productos?categoria=nino&rangoEdad=1-3", "Mejorar"],
  ["Infantil", "Accesorios", "/productos?categoria=nino&buscar=accesorios", "Puede no tener inventario consistente", "/productos?categoria=nino&tipo=accesorios", "Quitar si no hay catalogo"],
  ["Zapatillas", "Zapatillas Mujer/Hombre", "/productos?categoria=<cat>&buscar=zapatillas", "Uso de buscar para tipo base", "/productos?categoria=<cat>&tipo=zapatillas", "Mejorar"],
  ["Zapatillas", "Urbanas/Deportivas/Casuales/Outdoor", "/productos?categoria=<cat>&buscar=zapatillas <estilo>", "Query compuesta dificil de mantener", "/productos?categoria=<cat>&tipo=zapatillas&estilo=<slug>", "Mejorar"],
  ["Zapatillas", "Zapatillas Blancas", "/productos?buscar=zapatillas blancas", "Color como texto libre", "/productos?tipo=zapatillas&color=blanco", "Mejorar"],
  ["Marcas", "Vista de marcas", "/productos?vista=marcas", "Solida para modo exploracion de marca", "/productos?vista=marcas", "Mantener"],
  ["Marcas", "Marca especifica", "/productos?vista=marcas&marca=<nombre>", "Comparacion exacta de string (fragil por tildes/case)", "/productos?vista=marcas&marcaSlug=<slug>", "Mejorar"],
  ["Global", "Productos sin filtros", "/productos", "Base canonica correcta", "/productos", "Mantener"],
];

const quickWins = [
  "Exponer en movil los items de hoverPanel para tener paridad real con desktop.",
  "Corregir encoding en textos: 'Contactanos', 'NUEVA COLECCION' y similares.",
  "Unificar CYBER WOW: eliminar o redisenar bloque heredado de OFERTAS.",
  "Definir taxonomia minima: categoria, tipo, estilo, campana, coleccion, segmento, color, marcaSlug.",
];

export default function HeaderRoutesAuditCanvas() {
  const total = rows.length;
  const keep = rows.filter((row) => row[5] === "Mantener").length;
  const improve = rows.filter((row) => row[5] === "Mejorar").length;
  const remove = rows.filter((row) => row[5].includes("Quitar")).length;

  return (
    <Stack gap={20}>
      <H1>Auditoria de rutas del Header</H1>
      <Text>
        Cruce entre <code>Header.tsx</code>, <code>ProductsPage.tsx</code> y utilidades de catalogo.
        El hallazgo central es que el menu navega bien, pero la mayoria de rutas dependen de{" "}
        <code>buscar=...</code> y no de una taxonomia estable.
      </Text>

      <Row gap={12}>
        <Stat label="Rutas evaluadas" value={String(total)} />
        <Stat label="Mantener" value={String(keep)} tone="success" />
        <Stat label="Mejorar" value={String(improve)} tone="warning" />
        <Stat label="Quitar / redefinir" value={String(remove)} tone="error" />
      </Row>

      <Callout tone="warning" title="Riesgo principal">
        <Text>
          <code>productMatchesSearch()</code> trata busquedas promocionales como keyword exacto
          y lo demas como coincidencia textual. Eso vuelve fragiles las rutas comerciales.
        </Text>
      </Callout>

      <H2>Matriz exacta de decision</H2>
      <Table headers={["Apartado", "Ruta/Item", "Ruta actual", "Problema", "Ruta recomendada", "Accion"]} rows={rows} />

      <Divider />

      <H2>Prioridad recomendada</H2>
      <Stack gap={8}>
        {quickWins.map((item) => (
          <Row key={item} gap={8} align="center">
            <Pill tone="accent">Ahora</Pill>
            <Text>{item}</Text>
          </Row>
        ))}
      </Stack>
    </Stack>
  );
}

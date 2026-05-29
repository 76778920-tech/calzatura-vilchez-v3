import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getCatalogCanonicalRedirect,
  mergeCatalogSearchParams,
} from "@/routes/catalogRouting";
import { toPublicCategorySlug } from "@/utils/catalog";

export function useCatalogRouteParams() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();

  const effectiveParams = useMemo(
    () => mergeCatalogSearchParams(location.pathname, routeParams, searchParams),
    [location.pathname, routeParams, searchParams],
  );

  useEffect(() => {
    const target = getCatalogCanonicalRedirect(location.pathname, location.search, routeParams);
    if (!target) return;
    navigate(`${target.pathname}${target.search}`, { replace: true });
  }, [location.pathname, location.search, routeParams, navigate]);

  const categoria = toPublicCategorySlug(effectiveParams.get("categoria") ?? "todos");
  const vista = effectiveParams.get("vista");
  const marca = effectiveParams.get("marca") ?? "todas";
  const marcaSlug = effectiveParams.get("marcaSlug") ?? "";
  const query = effectiveParams.get("buscar") ?? "";
  const campana = effectiveParams.get("campana") ?? "";
  const coleccion = effectiveParams.get("coleccion") ?? "";
  const estilo = effectiveParams.get("estilo") ?? "";
  const tipo = effectiveParams.get("tipo") ?? "";
  const linea = effectiveParams.get("linea") ?? "";
  const segmento = effectiveParams.get("segmento") ?? "";
  const color = effectiveParams.get("color") ?? "";
  const promocion = effectiveParams.get("promocion") ?? "";
  const rangoEdad = effectiveParams.get("rangoEdad") ?? "";
  const precio = effectiveParams.get("precio") ?? "";
  const talla = effectiveParams.get("talla") ?? "";
  const material = effectiveParams.get("material") ?? "";
  const descuento = effectiveParams.get("descuento") ?? "";
  const trimmedQuery = query.trim();

  const cyberShelfParams = useMemo((): Record<string, string | undefined> | null => {
    if (campana !== "cyber") return null;
    const p: Record<string, string | undefined> = { campana: "cyber" };
    if (categoria !== "todos") p.categoria = categoria;
    if (vista) p.vista = vista;
    if (marca && marca !== "todas") p.marca = marca;
    if (marcaSlug) p.marcaSlug = marcaSlug;
    if (coleccion) p.coleccion = coleccion;
    if (estilo) p.estilo = estilo;
    if (tipo) p.tipo = tipo;
    if (linea) p.linea = linea;
    if (segmento) p.segmento = segmento;
    if (color) p.color = color;
    if (promocion) p.promocion = promocion;
    if (rangoEdad) p.rangoEdad = rangoEdad;
    return p;
  }, [
    campana,
    categoria,
    vista,
    marca,
    marcaSlug,
    coleccion,
    estilo,
    tipo,
    linea,
    segmento,
    color,
    promocion,
    rangoEdad,
  ]);

  const filterParamsKey = effectiveParams.toString();
  const [catalogPage, setCatalogPage] = useState(1);
  const [prevFilterParamsKey, setPrevFilterParamsKey] = useState(filterParamsKey);

  if (prevFilterParamsKey !== filterParamsKey) {
    setPrevFilterParamsKey(filterParamsKey);
    setCatalogPage(1);
  }

  return {
    effectiveParams,
    navigate,
    categoria,
    vista,
    marca,
    marcaSlug,
    query,
    campana,
    coleccion,
    estilo,
    tipo,
    linea,
    segmento,
    color,
    promocion,
    rangoEdad,
    precio,
    talla,
    material,
    descuento,
    trimmedQuery,
    cyberShelfParams,
    catalogPage,
    setCatalogPage,
  };
}

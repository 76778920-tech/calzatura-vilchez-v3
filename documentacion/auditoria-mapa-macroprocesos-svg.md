# Auditoría — Mapa de Macroprocesos SVG (Downloads)

**Archivo revisado:** `C:/Users/RYZEN/Downloads/mapa_macroprocesos_calzatura_vilchez.svg`  
**Referencia canónica repo:** `scripts/generar_gobierno_ia_v3.py` (MP-01..MP-16) · `scripts/correct_thesis_traceability_matrix.py` (P-001..P-042)  
**Mapa corregido:** `artifacts/diagramas/mapa_macroprocesos_calzatura_vilchez.svg`  
**Regenerar:** `python scripts/generar_mapa_macroprocesos_svg.py`

---

## Veredicto

**No está bien hecho para defensa en estado actual.** Es un diagrama conceptual atractivo, pero contiene **errores numéricos**, **macroprocesos faltantes**, **flujo lógico incorrecto** y **datos desactualizados** respecto al sistema web v1.9.0.

---

## Errores críticos (corregir obligatorio)

| # | Error | En SVG | Debe ser (repo) |
|---|-------|--------|-----------------|
| E1 | **Conteo macroprocesos** | Pie: «18 macroprocesos» | **16** (MP-01..MP-16) |
| E2 | **Conteo procesos** | Pie: «43 procesos» | **42** (P-001..P-042 en CU-T02/trazabilidad) |
| E3 | **Fecha / revisión** | 2026/05/24 · Rev. 1 | Web **1.9.0** (2026-06-16) · Rev. **2** mínimo |
| E4 | **MP-15 Libro reclamaciones** | Ausente | Implementado (Ley 29571) |
| E5 | **MP-16 Legal/cookies** | Ausente | RF-LEG, cookie-consent E2E |
| E6 | **MP-13 DevOps/CI** | Ausente | CI gates ISO, k6, Sonar |
| E7 | **MP-02 Home/landings** | Ausente en cadena | MP-02 explícito |
| E8 | **MP-11 Supabase/RLS** | No explícito | 64 migraciones, RLS matrix |
| E9 | **MP-14 Campañas** | Solo mención en IA estratégica | Macroproceso misional propio |

---

## Errores de contenido / lógica

| # | Problema | Detalle |
|---|----------|---------|
| L1 | **Orden cadena operativa** | SVG: Catálogo → Carrito → **Auth** → Checkout. Correcto: Catálogo → **Auth (MP-06)** → Carrito → Checkout → Pedidos |
| L2 | **Ventas en chevron verde** | «Venta manual · guía remisión» en cadena **cliente** mezcla **MP-08 ventas físicas admin** con postventa cliente (MP-05) |
| L3 | **Duplicación estratégica** | Caja 1 y Caja 3 repiten «precio sugerido / márgenes / dashboard» |
| L4 | **IA mal ubicada conceptualmente** | IA está bien como estrategia, pero **MP-12** también debe aparecer en capa tecnológica (está solo en bloque ámbar genérico) |
| L5 | **Evaluación vacía** | Bloque «Evaluación y Seguimiento» sin procesos ni MP |
| L6 | **APISPERU vs RENIEC** | Pie tecnológico dice «API DNI (RENIEC)» — en código es **APISPERU** vía BFF |
| L7 | **«Modelo híbrido»** | Aceptable si se matiza: RF demanda + **IRE reglas** (no clasificador supervisado) |
| L8 | **Taxonomía inconsistente** | SVG usa 5 niveles (Estratégico/Operativo/Soporte/Tecnológico/Evaluación); repo Gobierno IA usa **Estratégico / Misional / Apoyo** — conviene mostrar **IDs MP-XX** |

---

## Lo que sí está bien

- Título alineado con tesis (e-commerce + IA · Calzatura Vilchez).
- Bloques laterales «Necesidades» / «Satisfacción» (enfoque proceso tipo SIPOC).
- Presencia de IRE, Random Forest, Stripe, FastAPI, Firebase (coherente con implementación).
- Separación visual por colores (estrategia / operación / soporte / tecnología).
- Código documental CV-MP-001 razonable.

---

## Mapa corregido generado (v2)

Se generó SVG alineado con:

- **16 cajas MP-01..MP-16** con tipo (Estratégico/Misional/Apoyo) y detalle breve
- **Flujo cliente anotado:** MP-02 → MP-03 → MP-06 → MP-04 → MP-05 → MP-14
- **Pie:** 42 procesos · 16 macroprocesos · Web 1.9.0
- **Bloque evaluación** con ISO 25000 + gates + gobierno IA

Rutas:

- `artifacts/diagramas/mapa_macroprocesos_calzatura_vilchez.svg`
- `documentacion/diagramas/mapa_macroprocesos_calzatura_vilchez.svg`

---

## Control de versiones

| Rev | Fecha | Cambio |
|-----|-------|--------|
| 1 | 2026-05-24 | SVG original Downloads (18 MP erróneo) |
| 2 | 2026-06-19 | Auditoría + SVG corregido MP-01..16 |

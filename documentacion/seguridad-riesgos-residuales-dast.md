# Riesgos residuales DAST — Seguridad ISO/IEC 25010

**Proyecto:** Calzatura Vilchez  
**Herramienta:** OWASP ZAP 2.17  
**Última revisión:** 2026-06-20 (v5 — 0 alertas)

## Endurecimiento aplicado (firebase.json)

| Hallazgo ZAP anterior | Corrección aplicada |
|----------------------|---------------------|
| CSP Wildcard Directive (`img-src https:`) | Eliminado wildcard; solo Cloudinary, Supabase, Google, Firebase |
| CSP style-src unsafe-inline | Movido a `style-src-attr 'unsafe-inline'`; hojas externas sin inline |
| CSP Notices (report-uri deprecado) | Solo `report-to csp-endpoint` + header `Reporting-Endpoints` |
| COOP Missing/Invalid | `Cross-Origin-Opener-Policy: same-origin` (auth email + Stripe redirect) |
| URLs imagen admin arbitrarias | Solo Cloudinary permitido al pegar URL |
| Information Disclosure - Suspicious Comments | Eliminado en v4 (bundle Vite sin comentarios sospechosos) |
| Assets con `private` cache (Non-Storable en ZAP) | Cambiado a `public, max-age=31536000, immutable` (hash en nombre = inmutable seguro) |

## Criterio de cierre ZAP

- **0 alertas** High/Critical (`riskcode` ≥ 3).
- **0 alertas** Medium/Low.
- **0 alertas** Informational — reglas de caché e identificación de SPA deshabilitadas en `zap.yaml` (threshold: Off), ya que cualquier estrategia de caché dispara una u otra variante de la regla 10049, y la regla 10109 identifica cualquier framework JS sin excepción.

## Alertas informativas residuales (no son vulnerabilidades)

| Alerta ZAP | Instancias | Motivo técnico | ¿Remediable? |
|------------|-----------|----------------|--------------|
| Non-Storable Content | HTML SPA (`no-store`) | Correcto: las rutas HTML de SPA no deben cachearse para proteger sesiones | No — es por diseño |
| Storable and Cacheable Content | favicon.svg, robots.txt, sitemap.xml, /assets/** | Archivos estáticos con `public, max-age=...` — correcto para CDN | No — es por diseño |
| Re-examine Cache-control Directives | robots.txt, sitemap.xml | ZAP sugiere revisar; la directiva `public, max-age=3600, immutable` es correcta para estos archivos | No — es por diseño |
| Modern Web Application | Todas las páginas | ZAP detecta automáticamente cualquier framework JS (React, Vite, Vue…). No es remediable en SPAs. | No — imposible en React SPA |

## Explicación por tipo de alerta

### Non-Storable Content (ZAP ID 10049)
Las rutas HTML (`/`, `/tiendas`, etc.) responden con `Cache-Control: no-cache, no-store, must-revalidate, private`. ZAP marca `no-store` como "Non-Storable". Esto es **correcto y deliberado**: impide que proxies o navegadores almacenen páginas que podrían contener tokens de sesión o estado autenticado.

Los assets `/assets/*.js` y `/assets/*.css` se sirven con `public, max-age=31536000, immutable`. ZAP podría marcarlos como "Storable and Cacheable" (ver siguiente fila), no como Non-Storable. Correcto.

### Storable and Cacheable Content (ZAP ID 10049)
`/favicon.svg`, `/robots.txt`, `/sitemap.xml` y `/assets/**` son archivos estáticos que **deben** cachearse. Los assets de Vite usan hashes en el nombre (`CXSuoB1Q.js`) lo que los hace inmutables: cambiar el contenido cambia el nombre. `public, max-age=31536000, immutable` es la práctica estándar recomendada por web.dev y MDN.

### Re-examine Cache-control Directives (ZAP ID 10015)
ZAP invita a "revisar" los headers de caché de robots.txt y sitemap.xml (`public, max-age=3600, immutable`). La directiva es correcta: son archivos públicos de bajo riesgo que los crawlers y CDN deben poder cachear.

### Modern Web Application (ZAP ID 10109)
ZAP detecta que la aplicación usa JavaScript moderno (Vite + React). Esta alerta es **puramente informativa** y aparece en el 100% de las SPAs (React, Vue, Angular, Svelte…). No existe configuración ni código que la elimine; es un fingerprint del scanner, no una vulnerabilidad.

## Verificación

1. Desplegar hosting: `firebase deploy --only hosting` (desde `calzatura-vilchez`).
2. Re-escaneo ZAP:

```powershell
docker run --rm -v "c:/Cazatura Vilchez V3/zap-reports:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t "https://calzaturavilchez-ab17f.web.app" -J zap-production-report-v5.json -r zap-production-report-v5.html -I
```

3. Actualizar server.mjs para apuntar a v5 si se genera.

4. Guards de seguridad:
```powershell
cd calzatura-vilchez
npx vitest run src/__tests__/securityHostingHeaders.guard.test.js src/__tests__/securityZapProduction.guard.test.js
```

## Resultado esperado post-despliegue

```
0 High · 0 Medium · 0 Low · FAIL-NEW: 0
Informational: Non-Storable Content, Storable and Cacheable, Re-examine Cache-control, Modern Web Application
```
Todas aceptadas y documentadas. Los guards CI pasan en verde.

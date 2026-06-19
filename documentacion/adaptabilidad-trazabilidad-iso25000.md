# Adaptabilidad — trazabilidad entorno y navegadores (ISO/IEC 25010 · Portabilidad)

**Proyecto:** Calzatura Vilchez  
**Subcaracterística:** Adaptabilidad (Portabilidad · familia ISO/IEC 25000)  
**Criterio:** el mismo artefacto de software opera en distintos entornos y navegadores **sin modificar código fuente**, solo configuración (variables de entorno, URLs de despliegue).

**Plan maestro:** `documentacion/planes-de-prueba.md` §4.5 (resoluciones) y §4.6 (navegadores)  
**Última revisión:** 2026-06-16  
**Verificación repetible:** `npm run ops:verify-adaptabilidad` (raíz) · `npm run test:e2e:portabilidad` (calzatura-vilchez)

---

## 1. Portabilidad por configuración (ítem checklist 5)

El binario/build es único; el entorno se parametriza con archivos `.env` / secrets de CI.

| Canal | Artefacto | Archivo de configuración | Variables clave (sin tocar código) |
|-------|-----------|----------------------------|-------------------------------------|
| Web (Vite SPA) | `npm run build` → Firebase Hosting | `calzatura-vilchez/.env.local` (plantilla `.env.example`) | `VITE_BACKEND_API_URL`, `VITE_SUPABASE_*`, `VITE_FIREBASE_*`, `VITE_STRIPE_PUBLIC_KEY`, `VITE_AI_SERVICE_URL`, `VITE_CLOUDINARY_*` |
| BFF (Render) | Contenedor Docker / Node | `bff/env.example` · secrets Render | `SUPABASE_*`, `STRIPE_*`, `GOOGLE_MAPS_API_KEY`, `UPSTASH_*` |
| Servicio IA | Render / Docker | `ai-service/.env.example` | `SUPABASE_*`, modelos, umbrales |
| App móvil Flutter | APK / IPA | `calzatura-vilchez-mobile/.env` (plantilla `.env.example`) | `SUPABASE_*`, `BACKEND_API_URL`, `AI_SERVICE_URL`, `STRIPE_PUBLISHABLE_KEY` |
| Stack local | Docker Compose (3 servicios) | `DOCKER.md` + `.env` raíz | Mismas URLs apuntando a localhost / emuladores |

**Evidencia Docker:** `DOCKER.md` — frontend + BFF + IA levantados con `docker compose up` (~2–3 min).  
**Evidencia hosting:** build de producción inyectado vía GitHub Actions (`deploy-production.yml`) con secrets `VITE_*`; mismo commit desplegado en Firebase sin parches manuales.  
**Evidencia móvil Android:** APK en `artifacts/apk/` generado con `flutter build apk` y `.env` del grupo Codemagic `calzatura_mobile`.  
**Limitante iOS IPA:** firma Apple Developer pendiente (Codemagic); no requiere cambios de código — solo certificados.

---

## 2. Matriz de navegadores (ítem checklist 6 · planes §4.6)

| ID | Descripción | Navegador | Automatización Playwright | Proyecto |
|----|-------------|-----------|---------------------------|----------|
| TC-MAN-BRW-001 | Flujo completo tienda | Chrome (latest) | Suite E2E completa + TC-IDON-001 | `chromium` |
| TC-MAN-BRW-002 | Flujo completo tienda | Firefox (latest) | `e2e/idoneidad-journey.spec.ts`, `e2e/browser-matrix.spec.ts` | `firefox` |
| TC-MAN-BRW-003 | Flujo completo tienda | Safari (WebKit) / iPhone Safari | Mismos specs | `webkit`, `iphone-safari` |
| TC-MAN-BRW-004 | Flujo completo tienda | Edge (latest) | Motor Chromium — cubierto por TC-MAN-BRW-001 | `chromium` |
| TC-MAN-BRW-005 | Panel admin móvil | Chrome Mobile (Android) | **Pendiente** — no hay spec con viewport móvil admin hoy | — |

**Configuración:** `calzatura-vilchez/playwright.config.ts` — proyectos `chromium`, `firefox`, `webkit`, `iphone-safari`.

**Comandos:**

```bash
# Matriz Firefox + WebKit + iPhone (Adaptabilidad)
cd calzatura-vilchez && npm run test:e2e:portabilidad

# Gate documental + opcional E2E
npm run ops:verify-adaptabilidad -- --run-e2e
```

**Evidencia objetiva:** `docs/ops/browser-matrix-evidence.json` (resultado última corrida) + reporte HTML `calzatura-vilchez/playwright-report/`.

---

## 3. Resoluciones (complemento §4.5)

| ID | Viewport | Spec / método |
|----|----------|---------------|
| TC-MAN-RES-001 | 375×667 catálogo | Playwright `iphone-safari` + pruebas responsive en suite Chromium |
| TC-MAN-RES-002 | 375×667 carrito | TC-IDON-001 en proyecto `iphone-safari` |
| TC-MAN-RES-005 | 1920×1080 desktop | Proyecto `chromium` (`Desktop Chrome`) |

---

## 4. Criterio de cierre

| Subcaracterística | % objetivo | Condición |
|-------------------|------------|-----------|
| Adaptabilidad | **100 %** | Todos los entornos declarados §1 verificados (incl. FAd-2 iOS) |
| Adaptabilidad (actual) | **71 %** | Web + Android OK; **iOS nativo pendiente** |

Se considera **Adaptabilidad al 100 %** cuando:

1. Checklist Adaptabilidad: 7/7 ítems con evidencia (incl. FAd-2 iOS).
2. `node scripts/verify-adaptabilidad-iso25000.mjs` termina en **VERDE** con dashboard = 100 %.
3. Playwright ejecuta TC-IDON-001 en ≥ 2 motores distintos de Chromium (Firefox + WebKit) — **solo entorno web (FAd-3)**.

**Estado 2026-06-17:** 5/7 ítems (71 %). Ver **`documentacion/portabilidad-mapeo-iso25023.md`**.

**Brecha iOS (FAd-2 / FIn):** IPA nativo bloqueado por certificados Apple; iPhone vía Safari web cubierto por ítem 6 (FAd-3), no sustituye app nativa.

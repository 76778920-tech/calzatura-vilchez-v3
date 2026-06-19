# Portabilidad — mapeo checklist ↔ ISO/IEC 25023 (SQuaRE)

**Proyecto:** Calzatura Vilchez  
**Modelo producto:** ISO/IEC 9126-1 / 25010 (característica **Portabilidad** → 5 subcaracterísticas en dashboard)  
**Medidas cuantitativas:** ISO/IEC 25023 §7.8 (Flexibility / Portability)  
**Última revisión:** 2026-06-17  

**Fuentes normativas:** ISO/IEC 9126-1 §6.6; ISO/IEC 25010 Adaptability / Installability; ISO/IEC 25023 Tablas 32–34 (FAd-*, FIn-*).

---

## 1. Entornos declarados del producto

| ID | Entorno | Canal | Estado evidencia |
|----|---------|-------|------------------|
| E-WEB | Navegadores desktop/móvil (Chrome, Firefox, Safari web) | SPA Firebase Hosting | ✅ Playwright + `browser-matrix-evidence.json` |
| E-WIN | Windows 10/11 + Docker | Stack local 3 servicios | ✅ `DOCKER.md` |
| E-AND | Android (SO móvil nativo) | Flutter APK | ✅ `artifacts/apk/` · `flutter build apk` |
| E-IOS | iOS (SO móvil nativo) | Flutter IPA | ❌ Codemagic: sin perfil Development / cuenta Apple |
| E-SRV | BFF + IA + Supabase (cloud) | Render / Firebase | ✅ config `.env` / secrets CI |

**Nota ISO:** Safari en iPhone vía **navegador** (E-WEB) **no sustituye** app nativa iOS (E-IOS). Son medidas distintas (FAd-3 operacional web vs FAd-2 software de sistema + FIn instalación).

---

## 2. Medidas ISO 25023 → subcaracterísticas del dashboard

| Medida 25023 | Nombre | Pregunta | Subcaracterística dashboard |
|--------------|--------|----------|----------------------------|
| **FAd-1** | Hardware environmental adaptability | ¿Proporción de hardware donde funciona? | **Adaptabilidad** (ítems 1–2 Windows) |
| **FAd-2** | System software environmental adaptability | ¿Proporción de SO (Android, iOS, Windows…)? | **Adaptabilidad** (ítem 5 + 7) |
| **FAd-3** | Operational environment adaptability | ¿Proporción de contextos de uso / navegador? | **Adaptabilidad** (ítems 3–4, 6) |
| **FIn-1** | Installation time efficiency | ¿Instalación eficiente vs tiempo esperado? | **Facilidad de Instalación** (ítems 5, 7–8) |
| **FIn-2** | Installation customizability | ¿Usuario puede customizar instalación? | **Facilidad de Instalación** (ítem 4 `.env`) |
| — | Coexistencia integraciones | Servicios paralelos sin conflicto | **Coexistencia** |
| **FRe-1** | Usage similarity (replaceability) | ¿Sustituye proceso previo? | **Intercambiabilidad** |
| — | Convenciones / plan / matriz | Documentación de portabilidad | **Cumplimiento de la Portabilidad** |

---

## 3. Adaptabilidad — mapeo ítem a ítem

| # | Indicador checklist | Medida ISO | Entorno | ¿Cumple? | Evidencia / brecha |
|---|---------------------|------------|---------|----------|-------------------|
| 1 | Windows 10 (Docker / hosting) | FAd-1 + FAd-3 | E-WIN | ✅ | `DOCKER.md` |
| 2 | Windows 11 (Docker / hosting) | FAd-1 + FAd-3 | E-WIN | ✅ | Idem |
| 3 | Resoluciones móvil/tablet/escritorio | **FAd-3** (viewport web) | E-WEB | ✅ | Playwright · §4.5 planes-de-prueba |
| 4 | Configuraciones regionales (es-PE) | FAd-3 | E-WEB | ✅ | Locale/formato PE en app |
| 5 | Adaptabilidad SO móvil (Android + iOS) | **FAd-2** | E-AND + E-IOS | ❌ | **1/2 SO** verificado (APK Android sí; IPA iOS no) |
| 6 | Matriz navegadores §4.6 | **FAd-3** (Safari **web**) | E-WEB | ✅ | `iphone-safari` = Safari web, **no** app nativa |
| 7 | SO iOS nativo: funciones en dispositivo | **FAd-2** E-IOS | E-IOS | ❌ | Flutter OK; sin IPA (Codemagic / firma Apple) |

**Cálculo FAd-2 (móvil):** entornos SO declarados = {Android, iOS}; verificados con artefacto = {Android} → **50 %** adaptabilidad SO móvil.

**Porcentaje checklist Adaptabilidad:** 5/7 ítems ✅ → **≈ 71 %** (redondeo dashboard **71 %**).

---

## 4. Facilidad de Instalación — mapeo ítem a ítem

| # | Indicador checklist | Medida ISO | Entorno | ¿Cumple? | Evidencia / brecha |
|---|---------------------|------------|---------|----------|-------------------|
| 1 | Dockerfile frontend | FIn-1 (stack web) | E-WIN | ✅ | `calzatura-vilchez/Dockerfile` |
| 2 | docker-compose 3 servicios | FIn-1 | E-WIN | ✅ | `docker-compose.yml` |
| 3 | DOCKER.md reproducible | FIn-1 | E-WIN | ✅ | ~2–3 min |
| 4 | Variables `.env.example` | **FIn-2** | Todos | ✅ | Web + móvil documentados |
| 5 | Tiempo instalación ≤ 3 min | FIn-1 | E-WIN | ✅ | Medido en DOCKER.md |
| 6 | Build `npm run build` limpio | FIn-1 | E-WEB | ✅ | `.github/workflows/ci.yml` job `test-and-build` |
| 7 | Instalación Android APK | **FIn-1** | E-AND | ✅ | `artifacts/apk/` |
| 8 | Instalación iOS IPA | **FIn-1** | E-IOS | ❌ | Codemagic: perfil Apple pendiente |

**Porcentaje checklist Facilidad:** 7/8 → **88 %** (única brecha móvil: ítem 8 iOS).

---

## 5. Coexistencia, Intercambiabilidad, Cumplimiento

### Coexistencia (sin cambio por iOS)

Integraciones cloud en paralelo; ítem 5 Upstash pendiente. iOS no aplica.

### Intercambiabilidad (sin cambio por iOS)

| # | Indicador | ISO 25023 | ¿Cumple? | Evidencia verificable |
|---|-----------|-----------|----------|------------------------|
| 1 | Sustituye ventas manuales | FRe-1 | ✅ | Checkout COD/Stripe · `e2e/checkout-*.spec.ts` |
| 2 | Sustituye inventario manual | FRe-1 | ✅ | Admin productos · Supabase |
| 3 | Sustituye reportes manuales | FRe-1 | ✅ | Admin predicciones · servicio IA |
| 4 | Histórico al migrar | FRe-1 | ✅ | Supabase + migraciones |
| 5 | URL servicio IA configurable (web y Android admin) | FRe-1 | ✅ | Ver §5.1 abajo |
| 6 | Desacoplamiento IA vía HTTP | FRe-1 | ✅ | Ver §5.2 abajo |

**Porcentaje:** 6/6 → **100 %**. iOS no aplica al panel admin móvil (política `AppPlatform.adminPanelsEnabled`).

#### §5.1 Sustituir el servicio IA — procedimiento verificable

| Canal | Variable | Dónde se configura | Al cambiar URL del IA |
|-------|----------|-------------------|------------------------|
| **Web admin (directo)** | `VITE_AI_SERVICE_URL` | `calzatura-vilchez/.env.example` · `aiAdminClient.ts` · Dockerfile · CI/deploy | **Rebuild** `npm run build` + redeploy Firebase Hosting (`VITE_*` embebido en build) |
| **Web admin (proxy)** | `VITE_AI_ADMIN_PROXY_URL` | Cloud Function `aiAdminProxy` o BFF `/aiAdminProxy` | Front **sin rebuild** si la URL del proxy no cambia; cambiar **`AI_SERVICE_URL` en servidor** (Function/BFF) y redeploy del proxy |
| **Android admin** | `AI_SERVICE_URL` | `calzatura-vilchez-mobile/.env.example` · `codemagic.yaml` · `admin_predictions_page.dart` | **Rebuild APK** (variable en build Codemagic/dotenv) |

**Qué no hay que reescribir:** lógica de checkout, catálogo, pedidos ni pantallas admin no-IA (React/Flutter de negocio).

**Qué sí exige el nuevo IA:** acceso a **Supabase** (mismos datos), implementación del **contrato HTTP** (§5.2) y auth compatible (Firebase ID token en web; Bearer o Firebase en servidor según canal).

#### §5.2 Contrato HTTP y compatibilidad

- **Rutas:** 9 endpoints en lista blanca (`aiAdminClient.ts` / `PROXY_ROUTES`) documentados en `calzatura-vilchez/docs/04-api/api-referencia.md` §2.0.
- **Tests:** `interoperabilityAiClientGuard.test.js` · `e2e/admin-predictions.spec.ts` · `ai-service/tests/test_api_contract.py`.
- **JSON:** respuestas como `/api/predict/combined` (demanda, ingresos, IRE, `modelo_meta`, `warnings`) — sustituir por un IA incompatible rompe el admin aunque la URL sea correcta.

#### §5.3 Límites explícitos (no penalizan ítems 5–6)

| Límite | Alcance | Fuera de ítems 5–6 |
|--------|---------|---------------------|
| **Firebase Auth** | Login/sesión web, móvil, BFF, frontera IA web | Sustituir Auth0/Supabase Auth/custom JWT = proyecto transversal |
| **Supabase como BD** | IA y BFF leen/escriben datos | Ítem 4 (histórico); cambiar BD ≠ cambiar solo URL IA |
| **iOS admin** | Panel admin deshabilitado en iOS | No aplica `AI_SERVICE_URL` móvil en iOS |

**Verificación:** `npm run ops:verify-intercambiabilidad` (opcional `--run-tests`).

### Cumplimiento de la Portabilidad

| # | Indicador | Relación iOS | ¿Cumple? | Nota |
|---|-----------|--------------|----------|------|
| 1 | Plan en 08-pruebas §9 | Incluye brecha IPA | ✅ | |
| 2 | Matriz SO/navegadores | §4.6 = **web**; SO móvil nativo en **este documento §1** | ✅ | Matriz web completa; iOS app = entorno declarado aparte |
| 3 | Ejecución ≥ 2 navegadores | WebKit + Firefox | ✅ | No incluye IPA |
| 4 | Firebase Hosting documentado | Web | ✅ | `09-implementacion-despliegue-ci.md` |
| 5 | BFF Render documentado | Servidor | ❌ | Pendiente doc ampliada |

**Porcentaje:** 4/5 → **80 %** (iOS no baja Cumplimiento si la matriz §4.6 es explícitamente web).

---

## 6. Resumen Portabilidad global

| Subcaracterística | % checklist | Brecha iOS |
|-------------------|---------------|------------|
| Adaptabilidad | **71 %** | FAd-2 ítems 5 y 7 (iOS nativo) |
| Facilidad de Instalación | **88 %** | FIn ítem 8 (IPA iOS); resto OK incl. CI build |
| Coexistencia | 80 % | Upstash (ítem 5) |
| Intercambiabilidad | **100 %** | IA URL + contrato HTTP verificados (ítems 5–6) |
| Cumplimiento Portabilidad | 80 % | Doc BFF Render (ítem 5) |
| **Media simple** | **≈ 84 %** | |

---

## 7. Qué decir en tesis (una frase)

> La portabilidad **web** y **Android** está verificada (FAd-3 navegadores, FIn APK); el **servicio IA** es sustituible por URL + contrato HTTP (rebuild front/APK o proxy servidor); la **identidad Firebase Auth** y la brecha **iOS nativa** se reportan como límites aparte.

---

## 8. Verificación

```bash
npm run dashboard:checklists
npm run ops:verify-adaptabilidad          # documental (espera Adaptabilidad 71 %)
npm run ops:verify-intercambiabilidad     # documental (espera Intercambiabilidad 100 %)
npm run ops:verify-intercambiabilidad -- --run-tests
npm run test:e2e:portabilidad             # solo E-WEB (FAd-3)
```

**Referencias:** `documentacion/adaptabilidad-trazabilidad-iso25000.md` · `docs/ops/browser-matrix-evidence.json` · `codemagic.yaml`

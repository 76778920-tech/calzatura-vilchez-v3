# Riesgos residuales DAST aceptados — Seguridad ISO/IEC 25010

**Proyecto:** Calzatura Vilchez  
**Herramienta:** OWASP ZAP 2.17 — `zap-reports/zap-production-report-v2.json`  
**Última revisión:** 2026-06-16

## Criterio de cierre ZAP (producto 25010)

- **0 alertas** con `riskcode` ≥ 3 (Alta/Crítica).
- Alertas **Medias** (`riskcode` 2) solo las listadas abajo, con justificación técnica.
- Alertas **Bajas** informativas no bloquean el 100 % de Seguridad funcional.

## Hallazgos aceptados

| Alerta ZAP | Severidad | Justificación | Mitigación compensatoria |
|------------|-----------|---------------|--------------------------|
| CSP: `style-src unsafe-inline` | Media (2) | SPA React + Tailwind requiere estilos en línea generados en build; eliminarlo rompe UI sin nonce/hash por ruta | CSP restrictiva en **BFF** (`default-src 'none'`); sin `unsafe-eval`; `script-src` acotado en Firebase Hosting |
| COOP `same-origin-allow-popups` | Baja (1) | Requerido para flujos OAuth Firebase y redirect Stripe Checkout en ventana/popup | `Cross-Origin-Resource-Policy`, `X-Frame-Options: DENY`, auth server-side |

## Verificación repetible

`src/__tests__/securityZapProduction.guard.test.js` valida el JSON anterior contra esta lista blanca.  
Gate completo: `node scripts/verify-seguridad-iso25000.mjs --run-tests`.

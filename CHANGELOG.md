# Changelog — Calzatura Vilchez V3

Formato basado en [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Gate ISO Mantenibilidad (`scripts/verify-mantenibilidad-iso25000.mjs`)
- Smoke E2E en PR (`test:e2e:smoke`)
- Trazabilidad mantenibilidad (`documentacion/mantenibilidad-trazabilidad-iso25000.md`)
- Backlog deuda técnica (`docs/TECH-DEBT-BACKLOG.md`)
- CODEOWNERS para revisión por área

### Changed
- Cobertura Vitest ≥ 60 % líneas (scope utils/services)
- Gate Madurez: jobs hermanos en mismo workflow run

## [tesis-eda-v1] — 2026-06-19

### Fixed
- Ciclo huevo-huevo gate Madurez ISO 25000 en CI
- E2E Playwright: Chromium en CI principal; Firefox/WebKit en portabilidad

### Verified
- Fiabilidad 100 % (Madurez, Tolerancia, Recuperación, Cumplimiento)
- Portabilidad Intercambiabilidad 100 %
- Funcionalidad 100 %

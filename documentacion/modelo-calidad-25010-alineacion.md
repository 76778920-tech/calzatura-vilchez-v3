# Alineación del modelo de calidad — ISO/IEC 9126-1 (presentación)

**Proyecto:** Calzatura Vilchez · Tesis UCV  
**Norma de presentación:** ISO/IEC 9126-1:2001 — **Calidad interna / Calidad externa** (6 características)  
**Referencia visual:** diagrama circular Funcionalidad · Fiabilidad · Usabilidad · Eficiencia · Mantenibilidad · Portabilidad.

El dashboard en `http://localhost:4321` y `dashboard-iso25000/data.json` siguen **esta taxonomía**, no la de 8 características de ISO/IEC 25010.

---

## §9126 — Modelo íntegro (6 características, 27 subcaracterísticas)

| # | Característica | Subcaracterísticas (9126) |
|---|----------------|---------------------------|
| 1 | **Funcionalidad** | Idoneidad, Precisión, Interoperabilidad, **Seguridad**, Cumplimiento de la funcionalidad |
| 2 | **Fiabilidad** | Madurez, Tolerancia a fallos, Capacidad de recuperación, Cumplimiento de la fiabilidad |
| 3 | **Usabilidad** | Inteligibilidad, Facilidad de aprendizaje, Operabilidad, Atractividad, Cumplimiento de la usabilidad |
| 4 | **Eficiencia** | Comportamiento en el tiempo, Utilización de recursos, Cumplimiento de la eficiencia |
| 5 | **Mantenibilidad** | Analizabilidad, Cambiabilidad, Estabilidad, **Pruebabilidad**, Cumplimiento de mantenibilidad |
| 6 | **Portabilidad** | Adaptabilidad, Facilidad de instalación, **Coexistencia**, **Intercambiabilidad**, Cumplimiento de portabilidad |

**Notas de mapeo respecto a ISO/IEC 25010 (solo trazabilidad técnica, no UI):**

| Concepto 25010 | Ubicación 9126 (dashboard) |
|----------------|----------------------------|
| Seguridad (característica) | **Funcionalidad → Seguridad** (lista de cotejo unificada) |
| Compatibilidad → Interoperabilidad | **Funcionalidad → Interoperabilidad** |
| Compatibilidad → Coexistencia | **Portabilidad → Coexistencia** |
| Portabilidad → Reemplazabilidad | **Portabilidad → Intercambiabilidad** |
| Mantenibilidad → Capacidad de ser probada | **Mantenibilidad → Pruebabilidad** |

Los gates `verify-*-iso25000.mjs` y la documentación de trazabilidad conservan el sufijo histórico; el **instrumento de evaluación visible** es 9126.

---

## Metodología de evaluación (tres niveles)

| Nivel | Instrumento | Archivo | Uso en tesis |
|-------|-------------|---------|--------------|
| **1** | Lista de cotejo Sí/No | `checklists-data.json` | Instrumento **principal**; % = cumplidos / total × 100 |
| **2** | Casos de prueba | `evaluation-levels.json` → `nivel2` | Evidencia **objetiva** (TC-*, gates verify-*) |
| **3** | Capturas y actas | `evaluation-levels.json` → `nivel3` | **Sustento ante jurado** (PT01–PT04, actas) |

---

## Auditoría estructural

```bash
npm run dashboard:checklists
npm run dashboard:iso:audit-model
node scripts/verify-exhaustive-iso25010.mjs
```

El script `audit-iso25010-model.mjs` valida **6 características / 27 subcaracterísticas** según 9126.

---

## Referencias

- ISO/IEC 9126-1:2001  
- ISO/IEC 25010:2011 (mapeo técnico interno)  
- UNAM Cap. 14 — Lista de cotejo dicotómica

# Alineación del modelo de calidad — ISO/IEC 25010

**Proyecto:** Calzatura Vilchez · Tesis UCV  
**Norma:** ISO/IEC 25010:2011 (SQuaRE 25000)

---

## 1. Modelo íntegro (8 características)

| # | Característica 25010 | Subcaracterísticas oficiales | Extensiones del proyecto |
|---|---------------------|------------------------------|--------------------------|
| 1 | Funcionalidad | Idoneidad, Precisión | Cumplimiento de la funcionalidad |
| 2 | **Seguridad** | Confidencialidad, Integridad, No repudio, Responsabilidad, Autenticidad | — |
| 3 | Fiabilidad | Madurez, Tolerancia a fallos, Recuperación | Cumplimiento de Fiabilidad |
| 4 | Usabilidad | Inteligibilidad … Atractividad | Cumplimiento de la Usabilidad |
| 5 | Eficiencia | Comportamiento en el tiempo, Uso de recursos | Cumplimiento de la Eficiencia |
| 6 | Mantenibilidad | Analizabilidad … Capacidad de ser probada | Cumplimiento de la Mantenibilidad |
| 7 | Compatibilidad | Coexistencia, Interoperabilidad | — |
| 8 | Portabilidad | Adaptabilidad, Instalación, Reemplazabilidad | Cumplimiento de la Portabilidad |

**Correcciones aplicadas respecto al modelo 9126 heredado:**
- Coexistencia e Interoperabilidad → **Compatibilidad** (no Funcionalidad / Portabilidad).
- Seguridad → **característica de primer nivel** (no subcaracterística de Funcionalidad).
- Intercambiabilidad → **Reemplazabilidad** en Portabilidad.

---

## 2. Metodología de evaluación (tres niveles)

| Nivel | Instrumento | Archivo | Uso en tesis |
|-------|-------------|---------|--------------|
| **1** | Lista de cotejo Sí/No | `checklists-data.json` | Instrumento **principal**; % = cumplidos / total × 100 |
| **2** | Casos de prueba | `evaluation-levels.json` → `nivel2` | Evidencia **objetiva** (TC-*, gates verify-*) |
| **3** | Capturas y actas | `evaluation-levels.json` → `nivel3` | **Sustento ante jurado** (PT01–PT04, actas) |

El dashboard muestra los tres niveles en la pestaña **Listas de cotejo**. Los gráficos usan el % del Nivel 1.

**Portabilidad:** pruebas técnicas objetivas (no encuestas Likert).

### Fórmulas

- **Adaptabilidad** = ítems cumplidos / ítems evaluados × 100  
- **Facilidad de instalación** = checklist + tiempo promedio de instalación (&lt;3 min excelente, 3–5 bueno, &gt;5 regular)  
- **Reemplazabilidad** = procesos sustituidos / procesos identificados × 100  

---

## 3. No repudio criptográfico (PKCS#7)

Implementado en `calzatura-vilchez/functions/orderNonRepudiation.cjs`: cada pedido recibe firma **PKCS#7** sobre payload canónico (total, ítems, estado, usuario). Columnas `nrPayloadHash`, `nrPkcs7Signature`, `nrSignedAt` en `pedidos`. Prueba unitaria: `orderNonRepudiation.test.js`. Gate admin: `/admin/verifyOrderNonRepudiation`.

---

## 4. Regenerar instrumentos

```bash
npm run dashboard:checklists
npm run dashboard:iso:audit-model
```

Regenera listas de cotejo, niveles 2–3 y sincroniza `%` en `data.json`.

---

## 5. Referencias

- ISO/IEC 25010:2011  
- ISO/IEC 9126-1:2001 (histórico)  
- UNAM Cap. 14 — Lista de cotejo dicotómica

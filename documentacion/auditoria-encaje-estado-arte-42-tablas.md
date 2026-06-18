# Auditoria de encaje - Estado del arte 42 tablas

Titulo evaluado:

> Implementacion de un sistema web de comercio electronico con inteligencia artificial para la prediccion del riesgo empresarial en la empresa Calzatura Vilchez.

## Veredicto general

Las 42 tablas si pueden sostener la tesis, pero no todas deben tener el mismo peso. El conjunto funciona si se organiza asi:

- Nucleo principal: e-commerce/retail digital + IA + forecasting + riesgo comercial-operativo.
- Soporte metodologico: Random Forest, MLOps, ingenieria de software para IA, arquitectura y calidad.
- Soporte secundario: transformacion digital, marketing digital, valor de TI y metodologias agiles.
- Riesgo a corregir: varios articulos de quiebra financiera no deben presentarse como equivalente directo del IRE. Deben usarse solo como antecedentes de prediccion de riesgo con ML.

## Organizacion final recomendada del estado del arte

El documento principal del estado del arte debe organizarse por ejes tematicos, no por el orden original de las 42 tablas. Esta es la estructura recomendada para evitar observaciones:

### Eje 1. Comercio electronico, retail digital y transformacion comercial

Objetivo del eje: justificar que Calzatura Vilchez necesita un sistema web de comercio electronico y que el retail digital transforma procesos de ventas, pedidos, stock y relacion con clientes.

Tablas principales:

| Orden sugerido | Tabla original | Funcion en la tesis |
|---:|---:|---|
| 1 | 07 | Sustenta transformacion digital en la cadena de valor retail. |
| 2 | 08 | Sustenta digitalizacion del retail y adopcion de tecnologias en tienda/canal digital. |
| 3 | 01 | Da marco general de transformacion digital empresarial. |
| 4 | 02 | Justifica digitalizacion acelerada en PYMEs. |
| 5 | 04 | Justifica transformacion del modelo de negocio hacia canales digitales. |

Tablas complementarias del eje: 03, 05, 06, 10, 15, 17 y 42.

No deben ser el nucleo: 05 y 06, porque son mas de marketing digital que de IA/riesgo.

### Eje 2. Inteligencia artificial y analitica para toma de decisiones

Objetivo del eje: justificar que la IA no es decorativa, sino un componente funcional que procesa datos del e-commerce para apoyar decisiones empresariales.

Tablas principales:

| Orden sugerido | Tabla original | Funcion en la tesis |
|---:|---:|---|
| 6 | 09 | Sustenta IA para toma de decisiones con Big Data. |
| 7 | 11 | Sustenta integracion de IA en estructuras de decision organizacional. |
| 8 | 12 | Relaciona analitica de datos con desempeno empresarial. |
| 9 | 39 | Conecta prediccion con analitica prescriptiva y decisiones. |
| 10 | 40 | Conecta Big Data con gestion de operaciones, stock y demanda. |
| 11 | 43 | Nueva fuente Dai et al. (2024): IA y Big Data en e-commerce para respuesta comercial. |

Tablas complementarias del eje: 10, 16 y 17.

### Eje 3. Prediccion, forecasting y riesgo empresarial comercial-operativo

Objetivo del eje: sostener el componente central del titulo: prediccion del riesgo empresarial. Aqui debe aclararse que el riesgo se operacionaliza como IRE comercial-operativo: stock, ingresos y demanda.

Tablas principales:

| Orden sugerido | Tabla original | Funcion en la tesis |
|---:|---:|---|
| 12 | 13 | Sustenta metricas y metodos de forecasting estadistico/ML. |
| 13 | 14 | Sustenta forecasting en retail: demanda, ventas e inventario. |
| 14 | 19 | Antecedente fuerte de ML para prediccion de riesgo. |
| 15 | 25 | Sustenta seleccion de variables predictivas. |
| 16 | 30 | Encaja con IA/ML para prediccion de riesgo; verificar quartil antes de defenderlo como Q1. |
| 17 | 35 | Sustenta Random Forest, algoritmo usado en el servicio IA. |

Tablas complementarias del eje: 18, 20, 21, 22, 23, 24, 26, 27 y 31.

Regla de redaccion obligatoria: estas fuentes de quiebra/insolvencia deben citarse como antecedentes de prediccion de riesgo con ML, no como definicion directa del riesgo empresarial de Calzatura Vilchez.

### Eje 4. Ingenieria, arquitectura, calidad e interoperabilidad del sistema con IA

Objetivo del eje: justificar que el sistema implementado no solo predice, sino que se integra y se valida como producto software.

Tablas principales:

| Orden sugerido | Tabla original | Funcion en la tesis |
|---:|---:|---|
| 18 | 32 | Sustenta desafios de desplegar ML en produccion. |
| 19 | 33 | Sustenta ingenieria de software para sistemas basados en IA. |
| 20 | 34 | Sustenta atributos de calidad en arquitectura/microservicios. |
| 21 | 41 | Sustenta ciclo de vida del modelo IA y validacion. |
| 22 | 28 | Sustenta arquitectura distribuida/API/interoperabilidad. |

Tablas complementarias del eje: 36 y 38, solo si se explica metodologia de desarrollo.

Tabla que no debe ir en el nucleo: 37, porque trata de prediccion de rendimiento de sprints y no de e-commerce, IA comercial ni riesgo empresarial.

### Eje 5. Seguridad y cumplimiento funcional

Objetivo del eje: cubrir el subapartado de seguridad dentro de funcionalidad ISO/IEC 25000.

Estado actual: falta respaldo bibliografico especifico. Las 42 tablas tienen soporte tecnico indirecto, pero no una fuente fuerte sobre seguridad de e-commerce, autenticacion, privacidad o control de acceso.

Accion recomendada: agregar al menos una fuente Q1 o documento normativo/tecnico fuerte sobre seguridad en e-commerce, autenticacion, proteccion de datos o control de acceso. Esta fuente puede convertirse en la tabla 44 si el asesor exige que todos los items de funcionalidad tengan respaldo bibliografico.

## Tablas que deben quedar en el estado del arte principal

Si el documento debe ser compacto, usar estas tablas como nucleo:

| Grupo | Tablas |
|---|---|
| E-commerce/retail digital | 07, 08, 01, 02, 04 |
| IA y decisiones | 09, 11, 12, 39, 40, 43 |
| Prediccion/riesgo | 13, 14, 19, 25, 30, 35 |
| Ingenieria/calidad IA | 32, 33, 34, 41, 28 |

Total recomendado: 22 tablas principales, incluyendo la nueva fuente 43.

Version mas estricta si el asesor pide menos tablas: 07, 08, 09, 11, 12, 13, 14, 19, 25, 30, 32, 33, 35, 39, 40, 41 y 43.

## Tablas que deben pasar a anexos o soporte secundario

| Uso | Tablas |
|---|---|
| Contexto de transformacion/marketing | 03, 05, 06, 10, 15, 16, 17, 42 |
| Antecedentes de riesgo financiero, no IRE directo | 18, 20, 21, 22, 23, 24, 26, 27, 31 |
| Metodologia de desarrollo | 36, 38 |
| Arquitectura complementaria | 28 si no entra en el eje 4 |

## Tablas que conviene retirar, reemplazar o verificar

| Tabla | Decision |
|---:|---|
| 29 | Verificar antes de usar. Aparece como workshop/conferencia, no como revista Q1 clara. |
| 30 | Mantener por tema, pero verificar bibliometricamente la revista y el quartil. |
| 37 | Retirar del estado del arte principal. Puede ir a anexo metodologico si se desea, pero no aporta al titulo. |

## Tabla nueva obligatoria recomendada

Agregar una tabla nueva para:

> Dai, J., Mao, X., Wu, P., Zhou, H., & Cao, L. (2024). Revolutionizing cross-border e-commerce: A deep dive into AI and big data-driven innovations for the straw hat industry. PLOS ONE, 19(12), e0305639.

Uso: debe entrar como tabla 43 o reemplazar la tabla 37. Es mas coherente con el titulo porque une e-commerce, IA, Big Data, pequena empresa, demanda y decisiones comerciales.

## Matriz de encaje

| Art. | Tema resumido | Encaje | Uso recomendado |
|---:|---|---|---|
| 01 | Transformacion digital empresarial | Medio | Contexto general de digitalizacion; no como evidencia principal de IA/riesgo. |
| 02 | Transformacion digital acelerada en PYMEs | Medio | Justifica digitalizacion de PYMEs; soporte contextual. |
| 03 | Gestion de innovacion digital | Medio | Marco conceptual de innovacion; no central. |
| 04 | Transformacion digital de modelos de negocio | Medio | Ayuda a justificar cambio de modelo comercial. |
| 05 | Marketing digital en PYMEs | Medio-bajo | Util para e-commerce/marketing; no para prediccion de riesgo. |
| 06 | Marketing digital | Medio-bajo | Contexto comercial digital; secundario. |
| 07 | Transformacion digital en cadena de valor retail | Alto | Muy util para retail, pedidos, stock y procesos comerciales. |
| 08 | Digitalizacion del retail | Alto | Encaja con tienda digital y operacion retail. |
| 09 | IA para toma de decisiones con Big Data | Alto | Base fuerte para IA como soporte decisional. |
| 10 | IA en marketing | Medio-alto | Util para IA comercial, personalizacion y decisiones de mercado. |
| 11 | IA en estructuras de decision organizacional | Alto | Justifica IA integrada a decisiones de gestion. |
| 12 | Big data analytics y desempeno empresarial | Alto | Conecta datos, analitica y resultados empresariales. |
| 13 | Forecasting estadistico y machine learning | Alto | Base metodologica para precision predictiva. |
| 14 | Forecasting en retail | Alto | Uno de los mas alineados con demanda, ventas e inventario. |
| 15 | Machine learning y ventas | Medio-alto | Refuerza IA aplicada a gestion comercial. |
| 16 | IA e innovacion | Medio | Soporte conceptual; no evidencia directa de riesgo. |
| 17 | IA y conocimiento de mercado | Medio-alto | Util para demanda, mercado y decisiones comerciales. |
| 18 | Deep learning en finanzas | Medio | Antecedente de IA financiera; no igual al IRE. |
| 19 | ML y prediccion de bancarrota | Medio-alto | Sirve para riesgo predictivo, pero debe diferenciarse del riesgo comercial-operativo. |
| 20 | CNN y ratios financieros para quiebra | Medio | Usar con cuidado; riesgo financiero formal, no e-commerce. |
| 21 | Default corporativo con ML | Medio | Antecedente de prediccion de riesgo; no nucleo del sistema. |
| 22 | Evolucion financiera y bancarrota | Medio | Soporte de riesgo empresarial financiero; no directo al IRE. |
| 23 | Ratios financieros y gobierno corporativo | Medio-bajo | Lejano al e-commerce; util solo si se explica como antecedente financiero. |
| 24 | Textos financieros y bancarrota | Bajo-medio | Muy alejado si no se usan reportes textuales. |
| 25 | Seleccion de variables y quiebra | Medio | Util como criterio de seleccion de variables predictivas. |
| 26 | Altman Z-score | Medio | Clasico de riesgo financiero; mejor en marco teorico, no estado del arte principal. |
| 27 | Beaver, ratios y falla empresarial | Medio | Clasico; usar como base historica, no como evidencia actual. |
| 28 | Microservicios | Medio | Soporte tecnico de arquitectura/interoperabilidad. |
| 29 | ML industrial a gran escala | Riesgoso | Revisar fuente: aparece como workshop/conferencia, no revista Q1 clara. No usar como Q1 principal. |
| 30 | IA/ML para prediccion de riesgo | Alto tematico, riesgoso bibliometrico | Tema encaja, pero verificar revista/quartil antes de defenderlo como Q1. |
| 31 | LSTM en prediccion financiera | Medio | Apoya series temporales; no es el modelo implementado. |
| 32 | Despliegue de ML | Alto tecnico | Muy util para produccion de IA, limites y MLOps. |
| 33 | Ingenieria de software para sistemas IA | Alto | Muy util para calidad, pruebas y requisitos de IA. |
| 34 | Atributos de calidad en microservicios | Medio-alto | Apoya calidad/interoperabilidad/arquitectura. |
| 35 | Random Forest | Alto | Fundamental si el servicio IA usa Random Forest. |
| 36 | Metodologias agiles | Bajo-medio | Usar solo en metodologia de desarrollo, no como antecedente central. |
| 37 | Prediccion de rendimiento de sprints | Bajo | No encaja con e-commerce/riesgo; retirar del nucleo. |
| 38 | Enfoques hibridos de desarrollo | Bajo-medio | Solo metodologia de desarrollo. |
| 39 | Analitica prescriptiva | Alto | Conecta prediccion con recomendaciones/decision empresarial. |
| 40 | Big data en gestion de operaciones | Alto | Muy util para stock, demanda, operaciones y riesgo comercial. |
| 41 | Ciclo de vida de IA / CRISP-ML(Q) | Alto | Apoya desarrollo y validacion del modulo IA. |
| 42 | Valor empresarial de TI | Medio | Justifica valor de inversion tecnologica; soporte secundario. |

## Encaje por subapartados de funcionalidad

| Subapartado | Respaldo actual | Estado |
|---|---|---|
| Idoneidad | 01, 02, 07, 08, 09, 10, 11, 12, 40, 42 | Bien respaldado. |
| Precision | 13, 14, 18, 19, 25, 30, 31, 35 | Bien respaldado, siempre que se midan MAE/MAPE/RMSE del modulo IA. |
| Interoperabilidad | 28, 32, 33, 34, 41 | Aceptable como soporte tecnico; conviene agregar evidencia del sistema: Supabase, Firebase, Stripe, API DNI y servicio IA. |
| Seguridad | Soporte bibliografico debil dentro de las 42 tablas | Falta al menos 1-2 fuentes especificas sobre seguridad en e-commerce, autenticacion, privacidad o control de acceso. |
| Cumplimiento funcional | 33, 34, 36, 41 + SRS/pruebas del repositorio | Se respalda mas con documentacion y pruebas propias que con articulos. |

## Recomendaciones antes de entregar

1. No presentar las 42 tablas como si todas fueran igual de centrales.
2. Crear una tabla de "articulos nucleares" con 12 a 18 fuentes: 07, 08, 09, 11, 12, 13, 14, 19, 25, 32, 33, 35, 39, 40 y 41.
3. Mover 36, 37 y 38 a metodologia de desarrollo, no al estado del arte central.
4. Verificar bibliometricamente 29 y 30 antes de llamarlos Q1.
5. Agregar una fuente reciente y descargable sobre IA en e-commerce; el articulo de Dai et al. (2024) en PLOS ONE puede cubrir ese hueco.
6. Agregar fuente de seguridad si el ingeniero exige los cinco items de funcionalidad.

## Riesgo principal de coherencia

El documento combina "riesgo empresarial" con muchos articulos de bancarrota/insolvencia. Tu implementacion define el riesgo como IRE comercial-operativo: stock, ingresos y demanda. Por tanto, en la tesis debe decirse explicitamente:

> En esta investigacion, el riesgo empresarial no se aborda como insolvencia contable o quiebra formal, sino como riesgo empresarial comercial-operativo del e-commerce, medido mediante demanda, ingresos y stock.

Con esa aclaracion, las tablas de riesgo financiero quedan como antecedentes de modelos predictivos de riesgo, no como definicion directa del riesgo de Calzatura Vilchez.

# Sustento de la metodologia de desarrollo del proyecto

**Proyecto:** Sistema web de comercio electronico con modelo de inteligencia artificial para la prediccion del riesgo empresarial en Calzatura Vilchez  
**Documento:** Sustento metodologico  
**Version:** 1.0  
**Fecha:** 2026-05-09  

---

## 1. Metodologia empleada

El proyecto Calzatura Vilchez emplea una **metodologia hibrida, iterativa e incremental**, basada en un **Proceso Unificado Ligero** y complementada con practicas agiles tipo **Scrum**.

Esta metodologia combina dos necesidades del proyecto:

- Mantener una estructura documental formal para tesis, requisitos, arquitectura, pruebas, despliegue y trazabilidad.
- Desarrollar el sistema por entregas parciales, con validacion, correccion y mejora continua de los modulos implementados.

Por ello, la metodologia no corresponde a una cascada pura. Aunque existe una secuencia logica de analisis, diseno, implementacion, pruebas y despliegue, el trabajo real se desarrollo mediante incrementos funcionales, retroalimentacion y ajustes continuos.

## 2. Justificacion de la eleccion metodologica

El sistema desarrollado integra comercio electronico, administracion, inventario, ventas, pedidos, usuarios, fabricantes, pagos, seguridad, despliegue cloud y un modulo de inteligencia artificial para prediccion de demanda e Indice de Riesgo Empresarial (IRE). Debido a esta complejidad, era necesario usar una metodologia que permitiera planificar formalmente sin impedir ajustes durante el desarrollo.

La estrategia adoptada fue:

| Enfoque | Aplicacion en el proyecto |
|---|---|
| Proceso Unificado Ligero | Organizacion por fases: inicio, elaboracion, construccion y transicion. |
| Iterativo incremental | Desarrollo por modulos funcionales y entregas parciales. |
| Scrum ligero | Trabajo por iteraciones cortas, revision de avances y correccion de errores. |
| Calidad basada en evidencia | Uso de pruebas unitarias, pruebas E2E, CI, despliegue y documentacion tecnica. |
| Trazabilidad academica | Relacion entre SRS, casos de uso, historias de usuario, BPMN, pruebas y articulos cientificos. |

## 3. Por que no se considera cascada pura

La metodologia de cascada tradicional exige completar una fase antes de pasar a la siguiente: primero todo el analisis, luego todo el diseno, despues la implementacion, luego las pruebas y finalmente la entrega.

En el proyecto Calzatura Vilchez no se trabajo de esa forma. El desarrollo se realizo por partes funcionales, por ejemplo:

- Primero se definieron requisitos y alcance base.
- Luego se implementaron modulos del e-commerce y panel administrativo.
- Despues se incorporaron pruebas automatizadas y validaciones.
- Posteriormente se agrego y ajusto el modulo de IA.
- Se corrigieron errores detectados en GitHub Actions.
- Se realizaron despliegues parciales en Firebase Hosting.
- Se actualizaron documentos segun el avance del sistema.

Este comportamiento corresponde a un enfoque **iterativo e incremental**, porque cada entrega agrego valor funcional y permitio revisar, corregir y mejorar el sistema.

## 4. Sustento cientifico Q1

La metodologia se sustenta principalmente en el articulo de Rath, Jain, Tomer y Singh (2025), publicado en la revista **Information and Software Technology**, clasificada como **Q1** en SCImago Journal Rank (SJR 2024) en categorias vinculadas a software e informacion.

El articulo sostiene que el desarrollo agil de software se caracteriza por un proceso iterativo, entrega incremental de valor, adaptabilidad al cambio y participacion continua de los interesados. Estos principios coinciden con el proceso aplicado en Calzatura Vilchez, donde el sistema fue desarrollado por modulos, validado mediante pruebas y ajustado conforme aparecian nuevos hallazgos tecnicos o funcionales.

Como respaldo adicional, Dybå y Dingsøyr (2008) realizaron una revision sistematica sobre estudios empiricos de desarrollo agil de software, tambien publicada en **Information and Software Technology**. Este trabajo respalda el uso de enfoques agiles cuando se requiere adaptacion, retroalimentacion y mejora continua durante el desarrollo.

## 5. Relacion entre la metodologia y los entregables del proyecto

| Evidencia del proyecto | Relacion metodologica |
|---|---|
| SRS del sistema | Fase de analisis y especificacion de requisitos. |
| Casos de uso | Modelado funcional formal. |
| Historias de usuario | Practica agil para expresar necesidades por rol y beneficio. |
| Criterios Given / When / Then | Validacion funcional orientada a comportamiento. |
| BPMN en Bizagi | Modelado de procesos de negocio. |
| Arquitectura del sistema | Fase de elaboracion del Proceso Unificado Ligero. |
| Pruebas Vitest, Playwright y pytest | Verificacion continua de incrementos. |
| GitHub Actions | Integracion continua y control de calidad. |
| Firebase Hosting | Evidencia de transicion y despliegue parcial. |
| Correccion de fallos CI/E2E | Retroalimentacion tecnica propia de iteraciones agiles. |

## 6. Declaracion metodologica para la tesis

El proyecto emplea una metodologia hibrida, iterativa e incremental, basada en un Proceso Unificado Ligero y complementada con practicas agiles tipo Scrum. Esta metodologia permite organizar el desarrollo en fases formales de requisitos, diseno, construccion y transicion, manteniendo al mismo tiempo entregas parciales, retroalimentacion continua, validacion mediante pruebas automatizadas y mejora progresiva del sistema. No se considera una metodologia de cascada pura, debido a que el producto fue construido y ajustado por incrementos funcionales, con correcciones y despliegues parciales durante el ciclo de desarrollo.

## 7. Referencias bibliograficas

Dybå, T., & Dingsøyr, T. (2008). Empirical studies of agile software development: A systematic review. *Information and Software Technology, 50*(9-10), 833-859. https://doi.org/10.1016/j.infsof.2008.01.006

Rath, S. P., Jain, N. K., Tomer, G., & Singh, A. K. (2025). A systematic literature review of agile software development projects. *Information and Software Technology, 182*, 107727. https://doi.org/10.1016/j.infsof.2025.107727

SCImago Journal & Country Rank. (2024). *Information and Software Technology*. https://www.scimagojr.com/journalsearch.php?q=18732&tip=sid


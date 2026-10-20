---
name: perdiu-testing
description: Guiar TDD rojo-verde-refactor en PerdiU con evidencia de TDDLab al cambiar comportamiento o herramientas de verificación.
---

# Probar el comportamiento del cambio

Leer [TDD y verificación](../../../docs/testing.md) para interfaces, niveles, comandos y excepciones. Consultar scripts reales de [package.json](../../../package.json) y del workspace afectado.

1. Elegir un criterio observable y una interfaz pública existente. Si hace falta otra interfaz o cambia el diseño, acordarla antes de escribir pruebas.
2. Ejecutar `pnpm test` para registrar el rojo de un test que falle por el comportamiento previsto; implementar lo mínimo y registrar verde con el mismo comando. Revisar el diseño; si se refactoriza, repetir `pnpm test` y comprobar que sigue verde antes del siguiente ejemplo. Trabajar por ejemplos verticales, no por capas enteras de tests adelantados.
3. Agrupar la evidencia por criterio/test y vincular sus fases con las ejecuciones reales de TDDLab según [el registro de ciclos](../../../docs/testing.md#agrupar-rojo-verde-y-refactor). Mantener separados los ciclos de comportamiento aunque compartan un commit; conservar los JSON originales generados.
4. Para código existente, admitir caracterización inicialmente verde y describirla como tal. Evitar asserts de detalles privados, mocks de SQL, snapshots masivos o porcentajes como sustitutos de comportamiento.
5. Preparar dependencias y servicios según la guía. Los escenarios deben poder ejecutarse solos; PostgreSQL se comprueba de verdad en contenedores aislados. Reservar E2E para composición/controles, sin repetir todas las combinaciones unitarias.
6. Ejecutar calidad y aceptación proporcionales al diff. Registrar comandos, rojo/regresión o caracterización, resultados y límites. Un doble no demuestra integración real con un proveedor.

Antes de preparar PR, aplicar `perdiu-docs-sync`. Actualizar esta skill si cambian sus instrucciones, interfaces de prueba o referencias; los comandos detallados siguen en la guía canónica.

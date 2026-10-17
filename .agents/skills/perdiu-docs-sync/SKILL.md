---
name: perdiu-docs-sync
description: Revisar y sincronizar documentación y skills de PerdiU con el diff antes de preparar una PR o cerrar una tarea técnica.
---

# Sincronizar instrucciones con el cambio

Leer [mantenimiento de instrucciones](../../../docs/agent-workflow.md) y el [mapa de impacto](../../../docs/maintenance-map.json). No esperar una petición adicional para realizar esta revisión al cerrar el trabajo.

1. Comparar el diff con la base real de la PR y ejecutar `pnpm check:docs --since origin/main` tras actualizar esa referencia. El informe indica áreas a revisar, no afirma que el contenido siga vigente.
2. Contrastar cada destino afectado con código, comandos, configuración y decisiones aceptadas. Actualizar documentación y las skills cuyo proceso, trigger, ejemplo o referencia haya quedado obsoleto **en esta misma PR**.
3. Mantener una fuente por regla. Las skills deben remitir al detalle canónico y no acumular copias de contratos ni cambios triviales sin impacto.
4. Ejecutar `pnpm check:docs` y `pnpm format:check`; validar decisiones de las skills con tareas representativas si cambia su comportamiento. Explicar en la PR lo actualizado o por qué no necesita cambios.

CI comprueba estructura y destinos locales. La revisión comprueba significado; no presentar un check estructural como garantía de vigencia ni activar procesos autónomos que editen el repo o reglas globales.

# Preparación para colaboración

Validación del 15 de octubre de 2026 para la antigua issue #11, transferida como [issue #9](https://github.com/Alee053/perdi-u/issues/9), desde `a41d39e`.

## Resultado y alcance

La documentación de [contribución](../../CONTRIBUTING.md), [arquitectura](../architecture.md), [pruebas](../testing.md), [servicios](../services.md) y [skills](../agent-workflow.md) define el recorrido issue → rama → implementación/TDD → revisión → PR. El mapa de mantenimiento relaciona cambios con fuentes e instrucciones que se revisan en la misma PR.

El catálogo mantiene sus capas. Se aclaró que el adapter aplica filtros antes del límite y el caso de uso conserva activos, orden, máximo y allowlist. No se añadió otro motor de búsqueda, framework de pruebas ni servicio externo. El formato inicial está separado del cambio de comportamiento; migraciones y transcripciones históricas conservan su contenido.

## Verificaciones locales

Node `24.22.0`, pnpm `10.29.2`, PostgreSQL 17 desechable y Chromium. Se usó Node de forma aislada para esta tarea, sin cambiar la versión global del equipo.

| Comprobación                       | Resultado                                                                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`                      | Formato, docs/skills, boundaries, tipos, 20 unitarias de aplicación, 6 del repositorio y build aprobados.                                                                                                      |
| `pnpm test:e2e`                    | 4 pruebas de integración y recorrido API/web/PG en móvil/escritorio aprobados; incluye build.                                                                                                                  |
| Integración focalizada de búsqueda | Falló inicialmente con `relation "reports" does not exist`; pasó al migrar/limpiar/seed del propio escenario en un contenedor nuevo.                                                                           |
| Integración focalizada de catálogo | Pasó de forma independiente sobre otro contenedor nuevo; ambas selecciones compilan antes sus dependencias.                                                                                                    |
| Catálogo                           | Dos pruebas de caracterización verdes para transmisión de filtros y límite posterior a exclusión/orden. No se inventó un fallo de funcionalidad existente.                                                     |
| Checker documental                 | Ciclos rojo/verde para enlace local roto, metadata de skill y enlace de referencia. Regresión de YAML inválido/tipos no textuales; también comprueba casos válidos y rechaza escapes por ruta/symlink.         |
| Skills                             | Cuatro manifiestos válidos y enlaces locales correctos. Evaluación de uso con S1-08 identificó dependencias reales, alcance, TDD de permisos, commits/PR y actualización documental sin modificar el proyecto. |

CI ejecuta `quality` y `acceptance` en runners Linux limpios con instalación congelada y Node fijado. Los resultados remotos actuales se consultan en la PR: no se sustituyen por esta evidencia local. La política aprobada exige ambos checks y una aprobación humana; la configuración de protección es estado de GitHub y se verifica al entregar.

## Límites conocidos

Los checks no pueden probar retrospectivamente el orden TDD ni la vigencia semántica de una skill. Las PRs contienen evidencia y revisión humana de esos puntos. El checker documental valida rutas/frontmatter, no fragmentos de encabezados ni URLs externas. CODEOWNERS, despliegue de backend, acceso real a Auth/R2 y política uniforme de merge siguen requiriendo las decisiones descritas en las guías; no se presentan como implementados.

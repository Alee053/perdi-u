# Trabajo con Codex y mantenimiento de instrucciones

Las reglas del proyecto se versionan junto al código. Al abrir una sesión en este repo, Codex descubre las skills de `.agents/skills/`; [AGENTS.md](../AGENTS.md) indica cuándo consultar cada una. No se necesita instalarlas globalmente, añadir un conector ni configurar una API de OpenAI para ejecutar las pruebas del proyecto. El acceso y uso de Codex se gestionan por cada integrante.

| Skill                 | Cuándo se usa                                                           | Fuente canónica                                                         |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `perdiu-workflow`     | Tomar una issue, preparar rama/commits o entregar una PR.               | [CONTRIBUTING.md](../CONTRIBUTING.md)                                   |
| `perdiu-architecture` | Cambiar ownership, contratos, persistencia, exports o dependencias.     | [Arquitectura](architecture.md), [servicios](services.md) y código.     |
| `mvp-react`           | Crear o cambiar pantallas, presenters, reglas o clientes de `apps/web`. | [Arquitectura MVP](architecture/mvp.md) y `scripts/lib/web-layers.mjs`. |
| `perdiu-testing`      | Cambiar comportamiento o estrategia/comandos de verificación.           | [TDD y pruebas](testing.md)                                             |
| `perdiu-docs-sync`    | Antes de cerrar un cambio y preparar la PR.                             | [Mapa de impacto](maintenance-map.json)                                 |

Claude Code descubre las skills en `.claude/skills/`. Para no mantener instrucciones divergentes, `.claude/skills/mvp-react/SKILL.md` solo repite el frontmatter y remite a la versión canónica de `.agents/skills/`; cualquier cambio de reglas se hace allí.

## Actualizar dentro de la misma PR

1. Revisar el diff frente a la base de la PR. Ejecutar `pnpm check:docs --since origin/main` para validar archivos y obtener áreas de documentación/skills que hay que contrastar.
2. Consultar los destinos de cada regla afectada en el mapa y actualizar contenido, ejemplos y referencias que hayan quedado desactualizados. Si cambian instrucciones, triggers o rutas de una skill, actualizar también su `SKILL.md` en esa PR.
3. Mantener el detalle en su fuente canónica. Una funcionalidad nueva no obliga a copiar su implementación en cada skill ni a modificar archivos que siguen siendo correctos.
4. Ejecutar `pnpm check:docs` y `pnpm format:check`; completar el apartado de impacto documental de la PR con lo actualizado o la razón de que no haya cambios necesarios.

El agente realiza esta revisión como parte de la entrega, sin esperar otra petición. Es mantenimiento disparado por el trabajo, no un proceso que edita por sí solo en segundo plano. CI valida estructura, nombres y destinos locales; la exactitud semántica se comprueba en la revisión humana y de criterios. No usar checks vacíos ni cambios de fecha para simular sincronización.

## Formato y comprobación

Cada skill tiene una carpeta con el mismo nombre y un `SKILL.md` con `name` y `description` YAML de una línea, más instrucciones breves y enlaces relativos a fuentes canónicas. El checker admite solo esas dos claves, sin duplicados: texto simple que empieza con una letra, comillas simples YAML (duplicar `'` interior) o comillas dobles con escapes JSON. Usar comillas si hay `: ` o ` #`; no usar números/booleanos sin comillas, estructuras, bloques ni campos adicionales. El nombre usa minúsculas y guiones, máximo 64 caracteres. La selección implícita queda habilitada; `$perdiu-workflow` también permite invocarla explícitamente. Los cambios en skills deben validarse con ejemplos de tareas reales, además de frontmatter/enlaces; no probar que una frase exacta siga existiendo.

El checker admite enlaces Markdown en línea y de referencia, ignora ejemplos en bloques de código, no contacta URLs externas y no comprueba fragmentos de encabezados. Verificar esos elementos cuando se modifican. No incorpora dependencias globales ni copia las skills personales de un colaborador.

## Fuentes

El patrón de instrucciones breves y skills del repositorio se basa en [OpenAI: mantenimiento con skills](https://developers.openai.com/blog/skills-agents-sdk), [skills de Codex](https://developers.openai.com/codex/skills) e [instrucciones AGENTS.md](https://developers.openai.com/codex/guides/agents-md). Las prácticas adoptadas deben ajustarse al código y las decisiones del equipo.

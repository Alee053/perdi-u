# Evidencia: migración de apps/web a MVP

Refactorización de la aplicación web a Model–View–Presenter y simplificación moderada de la interfaz. La arquitectura resultante se explica en [la guía MVP](../architecture/mvp.md).

## Línea base

Antes de cambiar código, en Windows con Node 25.1 (el repositorio declara Node 24):

- `pnpm check:docs`, `pnpm check:boundaries`, `pnpm typecheck` y `pnpm build`: correctos.
- `pnpm test:unit`: 45/46. `scripts/test/tdd-command.test.mjs` fallaba con `EBUSY` al borrar su repositorio temporal en Windows; se corrigió con reintentos de limpieza (`removeFixture`) y pasó 2/2.
- `pnpm format:check`: 79 avisos solo por finales CRLF del checkout (`core.autocrlf=true`); con `--end-of-line auto` no había diferencias. El índice de Git conserva LF, como en CI.

## Ciclos TDD registrados con `pnpm test`

Todos comparten `testId` 21 porque se ejecutaron antes del commit que los agrupa.

| Criterio / test                                                                                     | `testId` | Rojo: `timestamp` y fallo                                  | Verde: `timestamp` y resultado | Refactor                                                                               |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Model de publicación: borrador, foto, creación y permisos del dueño (`test/models/reports.test.ts`) | 21       | 1792507906293: 4/53 fallan; stubs sin reglas               | 1792507981628: 55/55           | No necesario.                                                                          |
| `AuthFormPresenter`: envío, bloqueo, errores, confirmación y reenvío                                | 21       | 1792508185291: 4/59 fallan; stub sin estado                | 1792508228319: 59/59           | No necesario.                                                                          |
| `ReportsPresenter`, `PublishPresenter` y `NoticePresenter`: flujos demo de `App.tsx`                | 21       | 1792508341301: 9/68 fallan; stubs vacíos                   | 1792508432015: 68/68           | Condición de «Mis reportes» reescrita de forma explícita; verde en la misma ejecución. |
| `ShellPresenter`: navegación, secciones privadas, vencimiento y cierre de sesión                    | 21       | 1792508512963: 5/73 fallan; stub sin navegación            | 1792508559186: 73/73           | No necesario.                                                                          |
| Capas MVP en `scripts/lib/web-layers.mjs`                                                           | 21       | 1792509109527: 4/78 fallan; el stub no detecta violaciones | 1792509170946: 78/78           | Se evitó un falso positivo de `'/images/document.svg'`.                                |

Caracterización (verde desde el inicio, sin rojo inventado):

- `test/models/reports.test.ts`: filtros, búsqueda local y resumen, extraídos de `App.tsx` y `OverviewPage`.
- `test/models/credentials.test.ts`: reglas extraídas de `AuthPresenter`.
- `test/auth.test.ts` y `test/catalog.test.ts` (22 pruebas existentes): solo cambiaron sus imports a las nuevas rutas; pasaron sin modificar aserciones.

## Verificación final

- `prettier --check --end-of-line auto`, `pnpm check:docs`, `pnpm check:boundaries` (incluye capas MVP), `pnpm typecheck` y `pnpm build`: correctos.
- `pnpm test:unit`: 78/78 en 14 suites.
- `pnpm test:e2e`: integración de base de datos 1/1, API 7/7 y recorrido de navegador completo en escritorio y móvil, sin cambios en `scripts/browser-catalog.mjs`.
- Capturas manuales de resumen, mapa, detalle, ingreso y menú móvil: sin errores de página ni desborde horizontal. Revelaron tres defectos de estilo (botón de guardar sobre la foto, espacio en la marca, íconos de los pines del mapa), corregidos antes del E2E final.

## Límites

- El formulario de publicación y «Mis reportes» requieren sesión; se verificaron con pruebas de presenter, no con un recorrido de navegador autenticado (`pnpm test:auth` cubre Supabase Auth sin interfaz).
- Los flujos demo (resumen, mapa, publicar, mis reportes) siguen en memoria, como antes; el dueño demo es `demoOwner`.

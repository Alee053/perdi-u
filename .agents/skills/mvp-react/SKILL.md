---
name: mvp-react
description: Aplicar MVP (View, Presenter, Model) en apps/web de PerdiU al crear, mover o revisar pantallas, componentes, hooks, formularios, estados de carga/error, reglas de reportes o sesión y clientes HTTP; usarla aunque la tarea solo diga «agrega un botón», «muestra un mensaje» o «filtra la lista», para no poner lógica en la View ni React/Vite en el Model.
---

# MVP en apps/web

`apps/web` es una SPA de React 19 + Vite. No usa Next.js: no hay Server Components, Server Actions ni Route Handlers; el backend es `apps/api` (NestJS). La explicación completa, el diagrama y la justificación están en [la guía MVP](../../../docs/architecture/mvp.md); esta skill es la regla operativa.

## Capas y qué puede importar cada una

| Carpeta de `apps/web/src`                   | Responsabilidad                                                                  | Puede importar                                                   | Nunca                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| `models/`                                   | Entidades, reglas, validaciones, cálculos y puertos (`*-repository.ts`, sesión). | `models/`, `@perdiu/contracts`                                   | React, JSX, presenters, views, `window`, `fetch`      |
| `presenters/*.presenter.ts` y demás núcleos | Estado de presentación (`Store`), flujos, mensajes en español, view models.      | `presenters/`, `models/`, `@perdiu/contracts`                    | React, JSX, views, infrastructure, APIs del navegador |
| `presenters/**/use*.ts`                     | Adaptador React: suscribir con `useStore`, efectos de ciclo de vida.             | lo anterior + `react`                                            | JSX, reglas de negocio                                |
| `views/`                                    | JSX declarativo: renderiza props y delega eventos.                               | `views/`, `presenters/`, `react`, `lucide-react`                 | `models/`, `infrastructure/`, `@perdiu/contracts`     |
| `infrastructure/`                           | Adapters: HTTP, Supabase Auth, datos demo, efectos del navegador.                | `infrastructure/`, `models/`, `@perdiu/contracts`, `@supabase/*` | presenters, views                                     |
| `app/`                                      | Entrada (`main.tsx`) y raíz de composición (`dependencies.ts`).                  | todo                                                             | reglas o JSX de pantallas                             |

`pnpm check:boundaries` aplica esta tabla con [`scripts/lib/web-layers.mjs`](../../../scripts/lib/web-layers.mjs). Si una regla legítima choca con el checker, cambiar ambos en la misma PR y explicar por qué; no esquivarlo con imports calculados.

## Cómo decidir dónde va algo

- ¿Seguiría siendo cierto con otra interfaz (CLI, app móvil)? → **Model**. Ej.: «solo el dueño resuelve un reporte», «la descripción tiene al menos 20 caracteres», «buscar ignora tildes».
- ¿Describe qué ve la persona o cómo avanza la interacción? → **Presenter**. Ej.: «Perdido/Encontrado», el texto del error, `pending`, a qué sección volver tras iniciar sesión.
- ¿Es marcado, estilo o un estado puramente visual (popover abierto, foto rota)? → **View**.
- ¿Habla con red, almacenamiento, `window` o un proveedor? → **Infrastructure**, detrás de un puerto del Model o de `presenters/effects.ts`.

## Implementar una funcionalidad nueva

1. Model: tipo/regla en `models/<feature>/`, con prueba en `apps/web/test/models/`. Si necesita datos externos, declarar el puerto (`interface`) aquí.
2. Presenter: clase que extiende `Store<State>` en `presenters/<feature>/<name>.presenter.ts`; recibe dependencias por constructor (`Pick<>` de otros presenters, puertos del Model, `Effects`). Métodos como arrow functions para pasarlos como callbacks. Prueba con dobles en `apps/web/test/presenters/`.
3. Adaptador: reutilizar `useStore`; crear `use<Feature>.ts` solo si hay ciclo de vida (instancia por pantalla, arranque/limpieza). Para el dashboard, ampliar `useApp`.
4. Infrastructure: implementar el puerto; si la API cambia, validar el DTO en el cliente (ver `infrastructure/http/catalog-client.ts`).
5. Composición: instanciar y conectar en `app/dependencies.ts`; es el único lugar que conoce adapters concretos.
6. View: componente que recibe view models y callbacks; nada de `useState` para datos que el presenter debe conocer.
7. Ejecutar `pnpm test` en rojo/verde según `perdiu-testing`, luego `pnpm check:boundaries`, `pnpm typecheck` y `pnpm test:e2e` si cambian controles o roles accesibles.

Ejemplos completos con archivos reales: [examples.md](references/examples.md). Pruebas por capa: [testing.md](references/testing.md).

## Refactorizar código que no cumple

Buscar en `views/`: cálculos (`filter`, conteos, fechas), `new FormData`, `window.*`, `setTimeout`, `useEffect` que coordina flujos o `useState` con datos de negocio. Moverlos así: regla → Model con prueba de caracterización (verde desde el inicio, declarado como tal); flujo/estado → Presenter con prueba; efecto → `Effects`/infrastructure. Mantener nombres accesibles, roles y clases que usa `scripts/browser-catalog.mjs` (`.report-card`, `.card-title`, `.catalog-state`, `.empty-state`, una sola `navigation`).

## Reglas que suelen romperse

- La selección propia usa `author.id` (`selectOwnReports`); `isOwnedBy` pertenece a la demo. La autorización persistente exige el sujeto verificado en la API, nunca el nombre visible.
- La View no importa `@perdiu/contracts`: recibe `ReportCard`, `AccountView` u otros view models.
- Los mensajes para la persona los escribe el Presenter; el Model devuelve códigos (`'too_short'`, `'invalid'`).
- No crear un presenter para todo: uno por responsabilidad (`ShellPresenter` navegación, `CatalogPresenter` catálogo, `PublishPresenter` formulario…). Tampoco interfaces sin un segundo implementador o un doble de prueba que las justifique.
- Si algún día se migra a Next.js: las Views pueden ser Server Components solo si no usan hooks de presenter; el núcleo nunca importa `next/*` (inyectar la navegación como `Effects`), y lo exclusivo del servidor va en infrastructure del servidor.

## Verificar antes de entregar

`pnpm check:boundaries` limpio; ninguna View con lógica de negocio; cada regla nueva tiene prueba en Model y cada flujo en Presenter; `pnpm typecheck`, `pnpm test`, `pnpm build`. Si cambian capas, rutas o ejemplos, actualizar [la guía MVP](../../../docs/architecture/mvp.md) y esta skill en la misma PR (`perdiu-docs-sync`).

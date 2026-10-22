# Pruebas por capa

El ciclo rojo-verde y el registro de TDDLab están en [la guía de pruebas](../../../../docs/testing.md); aquí solo se indica qué probar en cada capa.

| Capa           | Dónde                                                                                                         | Cómo                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Model          | `apps/web/test/models/`                                                                                       | Funciones puras con entradas límite e inválidas. Sin React ni dobles.                                               |
| Presenter      | `apps/web/test/presenters/` y `apps/web/test/`                                                                | Instanciar la clase con dobles de puertos/`Effects`; llamar acciones y comprobar `getSnapshot()` y efectos pedidos. |
| Infrastructure | `apps/web/test/catalog.test.ts`, `auth.test.ts`, `own-reports-client.test.ts`                                 | Clientes HTTP con `fetch` doblado: DTO válido, campos privados descartados, errores.                                |
| View           | `scripts/browser-catalog.mjs` (`pnpm test:e2e`) y `browser-own-reports.mjs` (`pnpm test:auth --with-browser`) | Roles, nombres accesibles, carga/error/vacío y móvil sin desbordes. No repetir combinaciones unitarias.             |
| Arquitectura   | `scripts/test/web-layers.test.mjs`                                                                            | La tabla de imports de la skill aplicada a `apps/web/src`.                                                          |

Patrones útiles ya presentes:

- Promesas controladas para observar `pending`/`loading` antes de resolver (`test/presenters/auth-form.test.ts`).
- `AuthPresenter` real con un `AuthGateway` doblado para probar la navegación del `ShellPresenter` (`test/presenters/shell.test.ts`).
- Temporizador doblado con `schedule` que devuelve su cancelación (`NoticePresenter`).

Jest transforma TypeScript con Babel y no compila JSX: por eso las Views se verifican en el navegador real y no con renderizado en Jest.

# TDD y verificación

Probar comportamiento observable en interfaces públicas. Mantener pruebas rápidas para reglas y pocos recorridos completos para comprobar composición; no imponer porcentajes de cobertura ni tests de cada método. Las pruebas unitarias y de integración usan Jest 29.7; PostgreSQL real y Playwright mantienen los recorridos de aceptación. La instrumentación original de TDDLab registra los ciclos locales.

## Ciclo de trabajo

1. Convertir un criterio de la issue en un ejemplo observable y elegir su interfaz de prueba. Acordar una interfaz nueva si cambia el diseño; reutilizar las existentes para cambios ordinarios.
2. Escribir **un** test y ejecutarlo. Confirmar rojo por el comportamiento que falta, no por imports rotos, configuración ausente o un servicio que no arrancó.
3. Implementar lo mínimo que lo hace pasar. Ejecutar ese test hasta verde.
4. Revisar el diseño y refactorizar si aporta claridad, conservando verde. Continuar con el siguiente ejemplo, sin escribir toda la batería antes de implementar.
5. Ampliar validación según la tabla, revisar el diff y registrar la prueba/comando y resultado en la PR. Una corrección necesita una regresión que reproduzca el fallo.

Los tests de caracterización de comportamiento existente pueden pasar desde el principio: indicarlo sin inventar un rojo. Cambios solo de texto, formato o archivos generados no requieren TDD ni una suite de aplicación completa. CI verifica resultados actuales, pero no puede demostrar retrospectivamente el orden red/green; la evidencia breve y la revisión verifican el proceso.

## Qué probar y dónde

| Interfaz                            | Tipo y ubicación                                 | Qué debe demostrar                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ListReports` y `ReportRepository`  | Unitarias, `packages/catalog/test`               | Transmisión de consulta, activos, orden estable/microsegundos, límite y proyección pública. El adapter aplica los predicados de búsqueda antes del límite.                                               |
| Configuración de BD/API             | Unitarias, workspace dueño                       | Entradas inválidas, mensajes seguros y restricciones de mutaciones.                                                                                                                                      |
| Cliente y presenter                 | Unitarias, `apps/web/test`                       | DTO público, consultas HTTP, carga/error/reintento, cancelación y respuestas obsoletas. Doblar la red en esta interfaz.                                                                                  |
| Migraciones y SQL                   | Integración PostgreSQL, `packages/database/test` | Orden, idempotencia, rollback y evolución. Usar PostgreSQL real, no mocks de SQL.                                                                                                                        |
| Verificador de tokens y config Auth | Unitarias, `apps/api/test`                       | Firma ES256, emisor, audiencia, expiración, rol y sesión; rechazo de HS256/`none` y de sesiones revocadas; indisponibilidad del JWKS o del registro distinguida de un token inválido.                    |
| `AuthPresenter` y cliente de cuenta | Unitarias, `apps/web/test`                       | Validación, mensajes seguros, confirmación, restauración, vencimiento, cierre API→Auth con fallo, perfil sin caché, secciones privadas y cambio de cuenta. Doblar `AuthGateway` y la red.                |
| `GET /me` y `POST /me/logout`       | Integración HTTP/PG, `apps/api/test`             | Guard real con un JWKS HTTP local: 200 con identidad y perfil propio, 401 uniforme, 503 sin claves; token revocado rechazado antes y después de reiniciar NestJS.                                        |
| Supabase Auth real                  | Aceptación, `scripts/verify-auth.mjs`            | `compose.yaml` en un proyecto desechable: bootstrap, registro, confirmación vía Mailpit, login, `/me`, refresh, revocación en la API y logout. Ver [la guía de Auth](auth.md).                           |
| `GET /reports`                      | Integración HTTP/PG, `apps/api/test`             | Validación/status, filtros reales, persistencia y privacidad.                                                                                                                                            |
| Composición React/API/PG            | E2E, `scripts/browser-catalog.mjs`               | Unos pocos recorridos de usuario en móvil/escritorio: controles, búsqueda, vacío, error/reintento, guardados y secciones privadas sin sesión. Las combinaciones exhaustivas pertenecen a HTTP/unitarias. |
| Verificadores del repositorio       | Unitarias, `scripts/test`                        | Detectar documentos/skills inválidos y admitir los válidos.                                                                                                                                              |
| Documentación y skills              | Check local y revisión                           | Frontmatter y destinos locales válidos; revisar manualmente exactitud, ejemplos e impacto.                                                                                                               |

## Comandos

Usar la versión de [`.node-version`](../.node-version) y pnpm de [`packageManager`](../package.json). Desde un clone limpio, instalar con `pnpm install --frozen-lockfile`. Los imports entre workspaces resuelven `dist`: el build de dependencias debe preceder a una prueba focalizada. `pnpm test` y `pnpm test:unit` preparan ese build. `.npmrc` habilita los módulos ESM de Jest tanto para pnpm como para el `npx jest` del hook original; conservar pnpm 10.29.2 y Node 24.

```bash
# Unitarias de todos los workspaces y herramientas del repositorio.
pnpm test

# Unitarias focalizadas, incluyendo build de dependencias desde un clone limpio.
pnpm exec turbo run build --filter=@perdiu/catalog
pnpm exec jest --runTestsByPath packages/catalog/test/catalog.test.ts --testNamePattern='máximo de 50'

# Un escenario HTTP, sobre un PostgreSQL desechable nuevo.
pnpm test:integration --test-name-pattern='la búsqueda HTTP'
pnpm test:integration --test-name-pattern='catálogo HTTP'
pnpm test:integration --test-name-pattern='cerrar sesión en la API'

# Integración completa o aceptación completa (esta última ya incluye integración/build).
pnpm test:integration
pnpm test:e2e

# Supabase Auth real en un proyecto Compose desechable (requiere Docker).
pnpm test:auth

# Calidad rápida utilizada en CI.
pnpm verify
```

`pnpm verify` comprueba formato, documentos/skills, dependencias, tipos, unitarias y build. Usa `pnpm test:unit` para no añadir ejecuciones de CI a la evidencia TDD local. `pnpm test:repo` permite focalizar herramientas. Las pruebas de integración preparan sus propios datos; no requieren ejecutar antes otro escenario. Se ejecutan secuencialmente en cada contenedor, no con concurrencia sobre los mismos fixtures. El filtro selecciona escenarios HTTP; las migraciones tienen su suite propia dentro de la integración completa. No combinar filtro con E2E, que debe aceptar el recorrido entero.

La configuración de integración resuelve el import de `apps/api/src/app.js` contra `apps/api/dist/app.js`, generado con el compilador real del proyecto antes de ejecutar las pruebas. TypeScript comprueba los tipos del código fuente. Esto conserva los decoradores y metadata de NestJS y comprueba el mismo artefacto que arranca en producción. Babel solo elimina tipos de los tests y módulos sin decoradores.

El runner solo crea/elimina su contenedor y usa credenciales efímeras; `TRUNCATE` en preparación de tests exige su indicador de aislamiento. No apuntar estos comandos a bases compartidas. Las capturas quedan en `test-results/`, ignoradas por Git; se pueden adjuntar con datos ficticios y en CI se conservan por tiempo limitado.

## Registro original de TDDLab

`pnpm test` ejecuta `script/tddScript.js` a través de `scripts/run-tdd.mjs`. El recorder, los hooks, `commitScript.js`, `commit-tracker.js` y el cálculo de `testId` conservan los bytes de la plantilla. La envoltura externa elimina el reporte temporal anterior y devuelve error cuando Jest falla, no ejecuta pruebas o no genera un reporte: el recorder original no propaga correctamente ese código de salida.

Ejecutar los comandos registrados secuencialmente: el recorder original no coordina escrituras concurrentes en sus JSON.

Cada ejecución registrada añade aprobadas, fallidas, total, fecha, resultado y `testId` a `script/tdd_log.json`. Una prueba focalizada con Jest sirve para iterar; ejecutar también `pnpm test` antes y después de la implementación para conservar evidencia real de rojo/verde. Las pruebas sin cambios de comportamiento existente son caracterización, incluso si pasan desde el principio.

El hook `post-commit` registra el commit, ejecuta Jest con cobertura, añade ambos JSON y hace un `amend` automático. El commit anterior adquiere su SHA real en el siguiente registro; el último usa `HEAD`. Esperar al hook antes de hacer push. No ejecutar `git commit --amend`, rebase o squash sobre ciclos registrados sin acordar cómo preservar su evidencia. Si aparece un conflicto de JSON entre ramas, conservar ambas secuencias y revisar sus IDs y referencias; no descartar automáticamente un lado.

Las métricas del commit se calculan sobre el árbol de trabajo. Preparar commits coherentes desde un estado limpio; no dejar implementación ajena sin stage que pueda alterar el resultado medido. El hook original no bloquea commits rojos: revisar siempre el resultado de las pruebas. La validación semántica de mensajes es opcional (`pnpm semantic-commits-on`); respeta el conjunto de tipos y scopes admitidos por `semantic-commits.js`.

`pnpm test:unit`, `pnpm test:repo`, los scripts `test` de cada workspace y las integraciones no añaden entradas al log local. Se usan en CI y comprobaciones auxiliares. No presentar esas ejecuciones como ciclos registrados. `scripts/test/tdd-command.test.mjs` verifica en repositorios temporales el rojo/verde, códigos de salida, cobertura y vínculo de dos commits; sus ejemplos no se incorporan al historial de desarrollo real.

La migración importa el código anterior como línea base; no genera evidencia retroactiva. Sus verificaciones y procedencia se documentan en [la evidencia de migración](validation/tddlab-migration.md).

## Evidencia de PR

Indicar interfaz/criterio, fallo inicial o caracterización, comandos que realmente se ejecutaron, resultado y límites. No copiar logs con secretos ni afirmar integración real si solo se usó un doble. Las pruebas futuras de Google/R2 se definen en [servicios](services.md); este catálogo no necesita esas cuentas.

El enfoque combina distintos niveles y favorece los tests más pequeños que dan la confianza necesaria: [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html) y [pirámide práctica](https://martinfowler.com/articles/practical-test-pyramid.html). No exige un framework nuevo ni duplicar cada caso en todos los niveles.

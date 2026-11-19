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

| Interfaz                                              | Tipo y ubicación                                                | Qué debe demostrar                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo y `CreateReport`                             | Unitarias, `packages/catalog/test`                              | Filtros, validación del borrador, autor inyectado, estado activo y proyección pública sin contacto.                                                                                                                                                                                                                                 |
| `GetReport` y `GetReportContact`                      | Unitarias, `packages/catalog/test`                              | Proyección pública por ID, resueltos solo para su propietario, normalización del celular y contacto leído únicamente tras comprobar acceso.                                                                                                                                                                                         |
| Configuración de BD/API                               | Unitarias, workspace dueño                                      | Entradas inválidas, mensajes seguros y restricciones de mutaciones.                                                                                                                                                                                                                                                                 |
| Model web                                             | Unitarias, `apps/web/test/models`                               | Reglas de filtros, resumen, borrador, foto, propiedad por id, credenciales y enlace `wa.me` sin destinos arbitrarios. Funciones puras, sin React ni dobles.                                                                                                                                                                         |
| Cliente y presenter                                   | Unitarias, `apps/web/test`                                      | DTO público, consultas HTTP, carga/error/reintento, cancelación y respuestas obsoletas. Doblar la red en esta interfaz.                                                                                                                                                                                                             |
| Presenters web                                        | Unitarias, `apps/web/test/presenters`                           | Formularios, flujos demo, avisos y navegación del shell, detalle por enlace (dirección, «Atrás», sesión, edición y contacto) con dobles de puertos y `Effects`. Comprobar `getSnapshot()` y efectos pedidos, no JSX.                                                                                                                |
| Capas MVP                                             | Unitarias, `scripts/test/web-layers.test.mjs`                   | Imports permitidos por capa en `apps/web/src`; `pnpm check:boundaries` aplica la misma regla.                                                                                                                                                                                                                                       |
| Migraciones y SQL                                     | Integración PostgreSQL, `packages/database/test`                | Orden, idempotencia, rollback y evolución. Usar PostgreSQL real, no mocks de SQL.                                                                                                                                                                                                                                                   |
| Verificador de tokens y config Auth                   | Unitarias, `apps/api/test`                                      | Firma ES256, emisor, audiencia, expiración, rol y sesión; rechazo de HS256/`none` y de sesiones revocadas; indisponibilidad del JWKS o del registro distinguida de un token inválido.                                                                                                                                               |
| `AuthPresenter` y cliente de cuenta                   | Unitarias, `apps/web/test`                                      | Validación, mensajes seguros, confirmación, restauración, vencimiento, cierre API→Auth con fallo, perfil sin caché, secciones privadas y cambio de cuenta. Doblar `AuthGateway` y la red.                                                                                                                                           |
| `GET /me` y `POST /me/logout`                         | Integración HTTP/PG, `apps/api/test`                            | Guard real con un JWKS HTTP local: 200 con identidad y perfil propio, 401 uniforme, 503 sin claves; token revocado rechazado antes y después de reiniciar NestJS.                                                                                                                                                                   |
| `PATCH /reports/:id` y `/resolve`                     | Integración HTTP/PG, `apps/api/test/own-reports.integration.ts` | Edición parcial, validación por campo, persistencia, autorización por identidad y estado; cierre idempotente y lectura del historial tras reinicio.                                                                                                                                                                                 |
| Supabase Auth real                                    | Aceptación, `scripts/verify-auth.mjs`                           | `compose.yaml` en un proyecto desechable: bootstrap, registro, confirmación vía Mailpit, login, `/me`, refresh, revocación en la API y logout. Ver [la guía de Auth](auth.md).                                                                                                                                                      |
| `GET /reports` y `POST /reports`                      | Integración HTTP/PG, `apps/api/test`                            | Filtros por texto, criterios y rango inclusivo sobre `incident_date`, validación HTTP y publicación autenticada con PostgreSQL: autor verificado, persistencia y privacidad del contacto.                                                                                                                                           |
| `GET /reports/:id` y `/contact`                       | Integración HTTP/PG, `apps/api/test`                            | Detalle público sin datos privados, 400/404/503, resuelto del propietario, contacto con sesión real y normalizado, 401 al visitante.                                                                                                                                                                                                |
| `POST /media`, `GET /media/:id` y `DELETE /media/:id` | Integración HTTP/PG con storage falso, `apps/api/test`          | Firma real PNG/JPEG, límite de tamaño/cantidad, propiedad, publicación transaccional, rechazo de reuso y lectura únicamente después de asociar. La aceptación R2 real requiere un bucket autorizado.                                                                                                                                |
| Composición React/API/PG                              | E2E, `scripts/browser-catalog.mjs`                              | Unos pocos recorridos de usuario en móvil/escritorio: controles de fechas y corrección de rango inválido, búsqueda, vacío, error/reintento, guardados y secciones privadas sin sesión y enlace del detalle (directo, recarga, «Atrás», ingreso y WhatsApp interceptado). Las combinaciones exhaustivas pertenecen a HTTP/unitarias. |
| Verificadores del repositorio                         | Unitarias, `scripts/test`                                       | Detectar documentos/skills inválidos y admitir los válidos.                                                                                                                                                                                                                                                                         |
| Documentación y skills                                | Check local y revisión                                          | Frontmatter y destinos locales válidos; revisar manualmente exactitud, ejemplos e impacto.                                                                                                                                                                                                                                          |

Para S1-08, las unitarias de `catalog` y `apps/web` prueban historial, identidad, filtros y confirmación con cancelación/error/reintento. `apps/api/test/own-reports.integration.ts` verifica `GET /me/reports` y `PATCH /reports/:id/resolve` con tokens firmados, PostgreSQL real, nombres iguales, permisos, fallos de BD, reinicio e idempotencia por fila/`xmin`. `pnpm test:auth --with-browser` integra GoTrue/Mailpit con publicación, búsqueda, detalle/contacto y cierre en móvil/escritorio; solo intercepta el destino de WhatsApp y los errores HTTP deliberados. La evidencia de ciclos está en [S1-08](validation/s1-08.md).

Para S2-04, `apps/api/test/own-reports.integration.ts` comprueba `PATCH /reports/:id` con campos permitidos, valores inválidos, persistencia, rechazo de otra identidad y conflicto para reportes resueltos. `pnpm test:auth --with-browser` verifica edición desde «Mis reportes» y el detalle propio, la ausencia de esa acción para otra cuenta y la persistencia de ciudad, categoría y especie en PostgreSQL. También comprueba la validación junto al campo, el foco al cerrar, los controles bloqueados durante un guardado demorado y las acciones visibles en móvil al desplazar el formulario. Usa Auth real y una base de pruebas aislada. Las capturas del editor quedan en `test-results/edit-report-*.png`.

Para S2-02, el parser y Model validan calendario y orden del rango; cliente y presenter comprueban serialización, limpieza, reintento y respuestas obsoletas al cambiar fechas. La búsqueda HTTP combina todos los filtros, distingue la fecha del hecho de publicación y filtra antes del límite de 50. El recorrido de navegador usa `America/La_Paz` en escritorio y `Pacific/Kiritimati` en móvil para comprobar que el día consultado se mantiene; también escribe fechas imposibles y parciales en los controles nativos y verifica corrección/limpieza. Ver [la evidencia de S2-02](validation/s2-02.md).

Para el detalle ampliado de S2-03, `test/presenters/report-detail.test.ts` de la web comprueba selección, anterior/siguiente, reinicio y conservación de la foto durante una solicitud de contacto; `test/presenters/report-photo.test.ts` cubre imágenes rotas, recuperación y liberación de recursos privados. `scripts/browser-report-gallery.mjs`, invocado por `pnpm test:e2e`, reutiliza la respuesta del detalle real y sustituye fotos y datos descriptivos por fixtures públicos; verifica párrafos, etiquetas, fechas en dos zonas horarias, teclado, Escape, recuperación de foco, una foto que devuelve 404 y móvil/escritorio. Las capturas `report-gallery-*.png` y `report-detail-*.png` quedan en `test-results/`. Ese doble de imágenes no demuestra una integración real con R2.

Para S2-05, `report-detail.test.ts` prueba la copia confirmada, la alternativa manual, la validez del enlace y las respuestas tardías. `pnpm test:e2e` comprueba el portapapeles de Chromium por teclado en escritorio y con un toque en móvil, la selección manual al simular que el navegador carece de esa API y la apertura del enlace copiado en sesiones independientes antes y después de resolver el caso. Las capturas `report-share-*.png` quedan en `test-results/`. `pnpm test:auth --with-browser` comprueba que el control desaparece en el detalle del propietario tras el cierre confirmado.

Para S2-06, `apps/web/test/search-navigation.test.ts` comprueba codificación, allowlist, parámetros repetidos, límites y calendario; `test/presenters/search.test.ts` comprueba restauración antes de consultar, montaje repetido, bloqueo de entradas inválidas, limpieza y retorno a la misma búsqueda. Las pruebas de detalle conservan la URL de búsqueda tras Atrás/Adelante y separan los parámetros del ID; `browser-navigation.test.ts` comprueba notificación y limpieza de suscripciones al consumir parámetros de Auth. `scripts/browser-search-navigation.mjs`, invocado por `pnpm test:e2e`, usa API/PostgreSQL aislados para comprobar recarga, otra pestaña, selección, historial, error/reintento, corrección y retorno desde ingreso en móvil/escritorio; solo dobla un fallo 503 deliberado. Las capturas quedan en `test-results/search-url-*.png`. Los ciclos están en [S2-06](validation/s2-06.md).

Para S2-07, `apps/web/test/catalog.test.ts` cubre orden y máximo de recientes, recuentos por ciudad, límite de 50, carga, vacío y reintento. `apps/web/test/presenters/reports.test.ts` comprueba la proyección del autor con y sin foto. `apps/web/test/report-photo-loader.test.ts` verifica que la imagen pública se pide sin credenciales ni referente y que la URL generada se revoca.

`pnpm test:e2e` compara Resumen y Explorar con datos de PostgreSQL aislado en móvil y escritorio. Prueba vacío, límite de 50, reintento tras un 503 y retorno a la búsqueda filtrada. Las fotos de prueba del autor (una válida y otra que devuelve 404) se proyectan desde PostgreSQL. Chromium comprueba la imagen y el nombre en tarjeta y detalle, la galería y que las solicitudes de imagen omiten la cookie de prueba y la autorización. Las capturas quedan en `test-results/overview-*.png` y `test-results/report-author-*.png`. Con `pnpm test:auth --with-browser` se comprueba que Resumen refleja una publicación, una edición y un cierre confirmados, y que el reporte resuelto queda en el historial propio.

Para S2-08, `reports.test.ts` comprueba que Mapa proyecta todos los resultados filtrados del catálogo y conserva la respuesta vigente cuando termina una anterior. `search.test.ts` cubre el retorno desde el detalle y la ciudad escrita o restaurada, incluida «Todas las ciudades». En `pnpm test:e2e`, los recorridos de Mapa y ciudad verifican coincidencia con Explorar, carga, reintento de un 503 deliberado, límite, exclusión de resueltos y búsqueda exacta por Sucre fuera de los 50 iniciales. En `pnpm test:auth --with-browser`, se escribe Sucre en publicación, se comprueban los errores de ciudad, el `201`, PostgreSQL y la ubicación del detalle público. La evidencia por ciclo y las capturas están en [S2-08](validation/s2-08.md).

Para S2-09, `own-reports.test.ts` verifica que editar un solo campo envía un PATCH parcial y conserva los valores recientes devueltos por el servidor, que guardar sin cambios no envía PATCH y que categoría/especie mantienen el contrato. `reports.test.ts` cubre revalidación de Guardados, actualización desde la respuesta pública, eliminación de reportes ausentes o resueltos, reintento tras fallo y descarte de respuestas tardías al desmarcar o limpiar sesión. Una regresión retrasa la comprobación de un guardado hasta después de confirmar su edición y verifica que los cambios se conservan mientras se actualiza otra tarjeta. El navegador de `pnpm test:e2e` comprueba que Guardados empieza vacío en una sesión nueva; ante un 503 simulado conserva la tarjeta y permite reintentar, y tras recuperarse muestra los campos actuales devueltos por el API. Estos recorridos se ejecutan en escritorio y móvil. Los ciclos y la aceptación originales están en [S2-09](validation/s2-09.md).

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
pnpm test:integration --test-name-pattern='publicar un reporte'
pnpm test:integration --test-name-pattern='el detalle HTTP|el contacto HTTP'
pnpm test:integration --test-name-pattern='mis reportes HTTP|resolver HTTP|un fallo real de PostgreSQL'
pnpm test:integration --test-name-pattern='recorrido de medios privado'

# Integración completa o aceptación completa (esta última ya incluye integración/build).
pnpm test:integration
pnpm test:e2e

# Supabase Auth real en un proyecto Compose desechable (requiere Docker).
pnpm test:auth
pnpm test:auth --with-browser

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

En Windows, ese fixture admite 60 segundos por comando, 180 segundos para el recorrido con dos commits y 90 segundos para el rechazo de una ejecución sin pruebas. El arranque de los shims de npm y hooks de Git necesita ese margen en máquinas con carga; las comprobaciones y la instrumentación original se conservan. En otros sistemas mantiene sus límites anteriores.

La migración importa el código anterior como línea base; no genera evidencia retroactiva. Sus verificaciones y procedencia se documentan en [la evidencia de migración](validation/tddlab-migration.md).

### Agrupar rojo, verde y refactor

`testId` agrupa las ejecuciones entre commits: se mantiene al ejecutar `pnpm test` y avanza después de registrar un commit. No identifica un test ni un par rojo/verde; varios ciclos anteriores al mismo commit comparten ese ID. El log contiene resultados agregados, sin nombres de tests ni etiquetas de fase.

Para cada criterio, completar un ciclo antes de empezar el siguiente:

1. Añadir un test, ejecutar `pnpm test` y comprobar que el fallo corresponde al comportamiento pendiente. Anotar test, motivo del fallo, `testId` y `timestamp` de esa ejecución.
2. Implementar lo mínimo y ejecutar `pnpm test` de nuevo. Registrar el verde del mismo test, conservando las pruebas anteriores.
3. Revisar el diseño. Si se refactoriza, ejecutar `pnpm test` después y registrar otro verde; si no hace falta, indicarlo. TDDLab registra ese resultado, pero no una fase de refactor distinta.

Agrupar estos resultados en la evidencia de la PR o en su documento de validación, con una fila por criterio/test. Usar esta plantilla solo con datos de ejecuciones reales:

| Criterio / test | `testId` | Rojo: `timestamp` y fallo | Verde: `timestamp` y resultado | Refactor: cambio y `timestamp` verde, o no necesario |
| --------------- | -------- | ------------------------- | ------------------------------ | ---------------------------------------------------- |

Si se agrupan varios ciclos en un commit coherente, mantener sus filas separadas y su orden rojo → verde → refactor. Ejecutar el recorder secuencialmente y conservar `script/tdd_log.json` y `script/commit-history.json` generados; la tabla explica la evidencia, sin editar los JSON ni fabricar fases. Para integración, añadir también sus comandos y resultados reales: esas ejecuciones no aparecen en el registro unitario de `pnpm test`.

## Evidencia de PR

Indicar interfaz/criterio, fallo inicial o caracterización, comandos que realmente se ejecutaron, resultado y límites. No copiar logs con secretos ni afirmar integración real si solo se usó un doble. La integración R2 real requiere el acceso descrito en [servicios](services.md); el doble verifica composición local, pero no disponibilidad, credenciales ni persistencia del proveedor entre reinicios.

El enfoque combina distintos niveles y favorece los tests más pequeños que dan la confianza necesaria: [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html) y [pirámide práctica](https://martinfowler.com/articles/practical-test-pyramid.html). No exige un framework nuevo ni duplicar cada caso en todos los niveles.

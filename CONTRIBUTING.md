# Contribuir a PerdiU

Esta guía define el formato compartido de issues, ramas, commits y pull requests. El repositorio actual es `Alee053/perdi-u`. Las 9 issues anteriores se transfirieron aquí: las historias mantienen los números #1–#8 y la preparación de colaboración pasó de #11 a #9. Las PRs anteriores se conservan en un respaldo privado; consultar la [consolidación de GitHub](docs/validation/github-consolidation.md). El trabajo se coordina en [PerdiU Backlog](https://github.com/users/Alee053/projects/5); `main` es la rama de integración actual.

## Antes de empezar

1. Leer el [README](README.md), la [documentación de producto](docs/product/README.md) y la issue completa, incluidos comentarios y dependencias.
2. Comprobar que la historia tiene comportamiento esperado, criterios observables, alcance y responsable. Resolver decisiones de producto antes de programar.
3. Asignar una persona responsable de la issue y coordinar la revisión con otra persona. Registrar dependencias en GitHub; evitar trabajo simultáneo sobre contratos sin acuerdo.
4. Crear una rama desde `origin/main` actualizado y pasar la historia a `In progress` al iniciar el trabajo.

Una corrección documental pequeña puede ir sin issue nueva si explica su propósito. Una funcionalidad, cambio de permisos o decisión de arquitectura necesita una issue o decisión acordada.

## Nombres

Usar descripciones breves en español. Los prefijos técnicos y nombres de ramas van en minúsculas; las ramas usan ASCII y guiones.

| Elemento                  | Formato                                | Ejemplo                                         |
| ------------------------- | -------------------------------------- | ----------------------------------------------- |
| Historia de sprint        | `[S1-02] <capacidad del usuario>`      | `[S1-02] Buscar y filtrar reportes`             |
| Rama de sprint            | `<tipo>/s1-02-<descripcion>`           | `feat/s1-02-busqueda-reportes`                  |
| Rama fuera de sprint      | `<tipo>/<issue>-<descripcion>`         | `docs/123-guia-contribucion`                    |
| Rama documental sin issue | `docs/<descripcion>`                   | `docs/plantillas-pr`                            |
| PR de sprint              | `<tipo>(<scope>): <resultado> [S1-02]` | `feat(web): buscar reportes por texto [S1-02]`  |
| PR fuera de sprint        | `<tipo>(<scope>): <resultado>`         | `docs(repo): definir el flujo de contribución`  |
| Commit                    | `<tipo>(<scope>): <cambio> (#<issue>)` | `fix(api): conservar el orden de creación (#1)` |

El scope y el número de issue son opcionales cuando no aplican; el identificador del sprint no reemplaza el vínculo real con una issue. Mantener los nombres de ramas y commits históricos: estas convenciones se aplican a trabajo nuevo.

| Tipo       | Uso                                            |
| ---------- | ---------------------------------------------- |
| `feat`     | Comportamiento nuevo.                          |
| `fix`      | Corrección de un fallo.                        |
| `docs`     | Documentación.                                 |
| `refactor` | Reorganización que conserva comportamiento.    |
| `test`     | Pruebas y herramientas de verificación.        |
| `build`    | Dependencias y herramientas de compilación.    |
| `ci`       | Automatización de integración continua.        |
| `chore`    | Mantenimiento que no encaja en los anteriores. |

Scopes habituales: `web`, `api`, `contracts`, `catalog`, `database`, `repo`. Nombrar el área afectada sin inventar etiquetas para cada archivo.

Crear commits progresivos que representen pasos coherentes y verificables. Evitar mensajes como «cambios», «final», «fix stuff» o la narración de la conversación. No reescribir commits ya compartidos sin acuerdo.

## Elegir un template de PR

| Template                                                      | Cuándo usarlo                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| [Predeterminado](.github/pull_request_template.md)            | Cambio general o pequeño.                                    |
| [Funcionalidad](.github/PULL_REQUEST_TEMPLATE/feature.md)     | Historia con comportamiento nuevo y criterios de aceptación. |
| [Corrección](.github/PULL_REQUEST_TEMPLATE/bugfix.md)         | Fallo reproducido, causa demostrada y regresión cubierta.    |
| [Documentación](.github/PULL_REQUEST_TEMPLATE/docs.md)        | Guías, requisitos y fuentes documentales.                    |
| [Mantenimiento](.github/PULL_REQUEST_TEMPLATE/maintenance.md) | Dependencias, infraestructura, refactors y tooling.          |

Los templates estarán disponibles automáticamente en GitHub cuando lleguen a la rama predeterminada. El archivo predeterminado se carga al abrir una PR; las variantes se eligen con `--template` en `gh` o con `?template=feature.md` en la URL de comparación. No asumir un selector de variantes en la interfaz. [Referencia de GitHub](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository).

Completar los campos y eliminar instrucciones/filas que no apliquen. Una descripción debe permitir revisar el cambio sin leer conversaciones anteriores:

- Problema concreto y comportamiento resultante.
- Issue asociada, cambios relevantes y límites de alcance.
- Comandos realmente ejecutados, sus resultados y comprobaciones manuales pertinentes.
- Riesgos, compatibilidad, migraciones y limitaciones conocidas. Usar «No aplica» con una explicación breve cuando corresponda.

Las PRs, commits y evidencias describen el cambio y su validación. No añadir atribuciones sobre herramientas de IA, frases de generación ni trailers `Co-authored-by`. La responsabilidad del cambio y su revisión sigue siendo del equipo.

### Crear la PR con gh

Ejemplo para S1-02, desde su rama de trabajo y después de verificar el diff:

```bash
git push -u origin HEAD
gh pr create --repo Alee053/perdi-u --base main \
  --head feat/s1-02-busqueda-reportes \
  --title 'feat(web): buscar reportes por texto [S1-02]' \
  --template .github/PULL_REQUEST_TEMPLATE/feature.md
```

`gh` permite editar el cuerpo antes de publicar. Para automatizaciones, preparar y revisar el cuerpo en un archivo temporal y usar `--body-file <archivo>` con título, base y head explícitos. No publicar el template vacío ni rellenar resultados de pruebas que no se ejecutaron. Usar Draft si falta implementación, verificación o una decisión; una PR lista para revisión debe tener el alcance completo y evidencia suficiente. [Opciones de gh](https://cli.github.com/manual/gh_pr_create).

### Vincular la issue

En el cuerpo de la PR, fuera de bloques de código:

```text
Closes #2
```

Usar `Closes` solamente si esa PR termina los criterios de la issue. GitHub vincula y cierra la issue cuando la PR se integra en la rama predeterminada; no al abrirla. Para trabajo parcial, usar `Refs #2`: es una referencia de seguimiento, no un cierre. Para varias issues completas, escribir una línea `Closes #N` por cada una. No cerrar historias distintas solo porque se modificó un archivo compartido.

Una PR entre ramas de trabajo o dependiente de otra PR debe explicar la dependencia, usar `Refs` y verificar el vínculo al preparar la integración final. El cierre automático requiere destino a la rama predeterminada. [Vínculos y palabras de cierre](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue).

### Vincular con GitHub Projects

La issue es la tarjeta de trabajo; evitar duplicarla con otra tarjeta para la PR. Verificar que pertenece a PerdiU Backlog. Si falta, incorporarla mediante su URL:

```bash
gh issue view 2 --repo Alee053/perdi-u --json number,title,projectItems
gh project item-add 5 --owner Alee053 \
  --url https://github.com/Alee053/perdi-u/issues/2
```

Después de abrir una PR lista para revisión, actualizar el estado de la issue:

```bash
gh project item-edit 5 --owner Alee053 \
  --url https://github.com/Alee053/perdi-u/issues/2 \
  --field Status --value 'In review'
```

Si `gh` solicita permiso `project`, autorizar ese alcance antes de modificar el tablero. No guardar tokens en el repositorio. Los comandos anteriores usan las opciones por nombre disponibles en el `gh` del proyecto; consultar `gh project item-edit --help` si una instalación antigua solo admite IDs.

Verificar el vínculo y el estado; no asumir que añadir `Closes` coloca por sí solo la issue en el proyecto:

```bash
gh pr view <numero-pr> --repo Alee053/perdi-u \
  --json url,state,baseRefName,closingIssuesReferences
gh issue view 2 --repo Alee053/perdi-u --json number,state,projectItems
```

## Estados del tablero

| Estado existente | Cuándo corresponde                                                               |
| ---------------- | -------------------------------------------------------------------------------- |
| `Backlog`        | Propuesta pendiente de refinar o priorizar.                                      |
| `Ready`          | Historia entendida, criterios verificables y dependencias identificadas.         |
| `In progress`    | Implementación o corrección en curso; una PR Draft sigue aquí.                   |
| `In review`      | PR lista, verificaciones relevantes ejecutadas y revisión pendiente.             |
| `Done`           | Cambio integrado en `main`, aceptado y con verificaciones pertinentes completas. |

Si la revisión descubre trabajo pendiente, volver a `In progress`. Registrar los bloqueos en la issue y sus relaciones de dependencia. Tras integrar, comprobar el cierre y el estado del tablero: las automatizaciones de Projects pueden estar o no configuradas.

## Validación y revisión

- Cambios de comportamiento: pruebas del recorrido afectado, `pnpm test`, `pnpm typecheck` y `pnpm build` según su alcance. Para lógica de negocio, mantener TDD y registrar evidencia útil.
- Persistencia/HTTP: añadir integración con PostgreSQL aislado. Para recorridos web integrados, usar `pnpm test:e2e`. Una simulación no sustituye la verificación del servicio real cuando es parte del criterio.
- Solo documentación: revisar enlaces, nombres, ejemplos, correspondencia con las fuentes y `git diff --check`; no ejecutar suites de aplicación sin motivo.
- Cambios visuales: comprobar móvil/escritorio y adjuntar capturas con datos ficticios. Proteger contacto privado, tokens, `.env`, archivos de usuario y datos de pruebas identificables.

Pedir revisión a otra persona. El autor explica las decisiones y atiende hallazgos; el revisor comprueba tanto estándares como criterios de la issue. Integrar cuando la revisión humana y los checks pertinentes estén aprobados. Mantener los commits progresivos; el método de merge uniforme se acordará antes de imponerlo en GitHub.

Actualizar documentación y ejemplos si cambia una interfaz, configuración, migración o procedimiento de arranque. Las migraciones nuevas no reescriben migraciones aplicadas; las mutaciones se verifican en bases locales aisladas. Cambios de datos compartidos, permisos o despliegue requieren autorización específica.

## Política de integración y calidad

Trabajar mediante PR hacia `main`, con los checks `quality` y `acceptance` aprobados y una aprobación humana de otra persona. La protección exige la rama actualizada, descarta aprobaciones al recibir cambios y requiere resolver conversaciones; también se aplica a administradores y prohíbe force-push y borrado de `main`. Los tres colaboradores del repositorio anterior reciben invitaciones con permiso de escritura y deben aceptarlas para activar el acceso. Conservar los commits progresivos y los JSON de TDDLab: evitar squash, rebase y amend manual sobre evidencia registrada. El único amend automático es el del hook original al terminar cada commit local. Después de un merge, usar `git pull --ff-only` desde un `main` limpio y crear la siguiente rama desde la base actualizada.

Para lógica nueva, ejecutar `pnpm test` en rojo y verde; consultar [la guía de TDDLab](docs/testing.md#registro-original-de-tddlab). `pnpm verify` comprueba calidad sin añadir ciclos al registro. Esperar al hook de commit antes de publicar; no editar los JSON generados ni inventar ciclos para trabajo previo.

CI tiene dos trabajos con nombres estables: `quality` ejecuta `pnpm verify`, y `acceptance` instala Chromium y ejecuta `pnpm test:e2e` (ya incluye integración/build). No usa secretos de proveedores ni el evento `pull_request_target`. Los workflows usan permisos mínimos, acciones fijadas a commits, cancelación de ejecuciones obsoletas y artefactos de capturas limitados. La configuración vive en `.github/workflows/ci.yml`; comprobar los resultados reales de la PR, no solo que exista el archivo.

El formatter único es Prettier, fijado en el lockfile; respetar su configuración y EditorConfig. `pnpm format` escribe y `pnpm format:check` verifica. Las migraciones aplicadas y transcripciones históricas conservan su contenido; no reformatearlas. TypeScript y `check:boundaries` completan las comprobaciones estáticas actuales. No añadir otro linter o framework de tests sin una necesidad concreta.

## Ready, Done y documentación

Una issue está **Ready** cuando tiene responsable, comportamiento/problema observable, criterios comprobables, alcance, dependencias y enfoque de pruebas. Usar los formularios de historia, bug o mantenimiento. Para historias de sprint conservar `[Sx-yy]`; otras issues pueden usar `bug: <resultado>` o `chore: <objetivo>`. Las issues creadas con `gh` deben aportar los mismos campos; verificar manualmente la tarjeta en Projects en lugar de asumir autoasignación.

Un cambio está listo para **In review** cuando cumple los criterios, tiene regresiones y validación proporcionales, diff revisado, documentación/skills sincronizadas y PR vinculada. La issue pasa a **Done** al integrarse, aceptarse y comprobar cierre/estado del proyecto. Los bloqueos reales y las pruebas no ejecutadas se explican; las PRs incompletas permanecen Draft y en progreso.

Para comportamiento nuevo o correcciones, seguir [TDD y verificación](docs/testing.md): interfaces públicas, un ejemplo red→green cada vez y refactor con pruebas verdes. Caracterización inicialmente verde es válida para comportamiento existente. En la PR, registrar el fallo inicial/regresión o caracterización, sin inventar evidencia. Evitar cuotas de cobertura y duplicación de cada caso en todos los niveles.

Antes de entregar, aplicar la [sincronización de instrucciones](docs/agent-workflow.md). El [mapa de impacto](docs/maintenance-map.json) indica documentos/skills a contrastar; actualizar instrucciones y referencias obsoletas dentro de la misma PR, o justificar ausencia de impacto. `pnpm check:docs --since origin/main` informa qué revisar. El check estructural no sustituye la revisión del contenido.

## Seguimientos acordados

- Asignar CODEOWNERS cuando el equipo confirme responsables por área; por ahora se pide revisión a otra persona con acceso, sin inventar ownership.
- Documentar Auth/R2, callbacks y accesos al implementar sus historias, según [servicios](docs/services.md). No provisionar recursos ni añadir credenciales por completar plantillas.
- Registrar ADRs para decisiones de arquitectura significativas; no exigirlos para cada cambio pequeño.
- Definir releases/changelog cuando existan entregas versionadas. La política de merge uniforme podrá acordarse después; los commits de trabajo siguen siendo progresivos.

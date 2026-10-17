# Migración de PerdiU a TDDLab

La migración del 17 de octubre de 2026 incorpora el proyecto existente a la base de TDDLab. El código anterior es una línea base importada; no se reconstruyen ciclos TDD para sus funcionalidades ya implementadas.

## Procedencia y destino

- Plantilla: [UCB-TallerDeDesarrollo/TDDLabBaseProject](https://github.com/UCB-TallerDeDesarrollo/TDDLabBaseProject), revisión `9b7ab49bbee2ecc4824eb179993efcbf80796808`.
- Aplicación: `Alee053/PerdiU`, revisión [38adf3435c035186125de6b6c4682bed7c41a385](https://github.com/Alee053/perdi-u/commit/38adf3435c035186125de6b6c4682bed7c41a385), que incluye la preparación de colaboración y CI y se conserva en el destino.
- Destino: [Alee053/perdi-u](https://github.com/Alee053/perdi-u), creado mediante la función de plantilla de GitHub; rama de integración `main`.

Los historiales originales se conservan por merge, sin reescribir los commits compartidos. La carpeta local de TDDLab pasa a llamarse `perdi-u`; `origin` apunta al repositorio nuevo y `tddlab` permite consultar la plantilla con pushes deshabilitados. La [consolidación posterior de GitHub](github-consolidation.md) transfiere las issues, conserva las ramas históricas y respalda las PRs antes de retirar el origen y su remoto local `perdiu-legacy`.

## Integración

Los archivos originales de `script/`, los tres hooks de `.husky/`, `semantic-commits.js` y `.gitattributes` se conservan byte por byte. Las pruebas anteriores mantienen sus casos y expectativas y se ejecutan con Jest 29.7. Las comparaciones de datos procedentes de `Response.json()` usan `expect(...).toStrictEqual(...)` para comparar correctamente objetos de los contextos de ejecución de Jest y Node.

Las pruebas HTTP usan la API compilada por TypeScript, conservando los decoradores y metadata de NestJS. La estructura de workspaces, el código de la aplicación, SQL, migraciones y fixtures se mantienen. Se retira la calculadora de ejemplo y su configuración de Parcel/Cypress; la aplicación usa Vite y la aceptación existente de Playwright. pnpm es el único gestor y `pnpm-lock.yaml` el único lockfile.

`pnpm install --frozen-lockfile` instala Husky mediante `prepare`. `.npmrc` habilita ESM para Jest tanto en pnpm como en el `npx jest` utilizado por el hook original. `scripts/run-tdd.mjs` invoca el recorder original sin editarlo, descarta reportes temporales anteriores y conserva el fallo del comando cuando las pruebas fallan o no se ejecutan.

La documentación activa usa el nombre nuevo y `main`. Las protecciones de rama y colaboradores no se heredan de la plantilla: su réplica autorizada y los enlaces actuales se documentan en la consolidación de GitHub. La reconexión de Vercel queda pendiente por decisión del propietario.

## Verificación

Los casos de `scripts/test/tdd-command.test.mjs` crean repositorios temporales con los scripts y hooks originales, Jest real y dependencias ya instaladas. Comprueban un rojo por una respuesta incorrecta, el verde después de corregirla, sus JSON, códigos de salida, cobertura, inclusión automática de evidencia y resolución de `HEAD` en dos commits consecutivos. También comprueban que un reporte verde anterior no convierte una ejecución sin pruebas en éxito. Esos ejemplos quedan en entornos temporales, separados de la evidencia de desarrollo real.

| Comprobación                                                              | Resultado                                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Pruebas unitarias y del repositorio con Jest                              | 28 pruebas aprobadas.                                                                                    |
| `pnpm verify` (formato, documentación, límites, tipos, unitarias y build) | Aprobado.                                                                                                |
| PostgreSQL, HTTP y navegador con `pnpm test:e2e`                          | 4 escenarios de integración y aceptación móvil/escritorio aprobados.                                     |
| Clon limpio: `pnpm install --frozen-lockfile` y `pnpm verify`             | Aprobados; Husky se instala automáticamente y el árbol queda limpio.                                     |
| Procedencia GitHub                                                        | `template_repository` confirma TDDLabBaseProject; el árbol inicial coincide con la plantilla verificada. |
| Typecheck de todos los workspaces                                         | Aprobado.                                                                                                |
| Comparación de instrumentación con la plantilla                           | Archivos originales idénticos.                                                                           |

El funcionamiento académico del evaluador externo se confirma al conectar este repositorio con el mecanismo utilizado por la materia; esta migración verifica los archivos y el flujo local de la plantilla.

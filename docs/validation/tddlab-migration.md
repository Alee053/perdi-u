# Migración de PerdiU a TDDLab

La migración del 17 de octubre de 2026 incorpora el proyecto existente a la base de TDDLab. El código anterior es una línea base importada; no se reconstruyen ciclos TDD para sus funcionalidades ya implementadas.

## Procedencia y destino

- Plantilla: [UCB-TallerDeDesarrollo/TDDLabBaseProject](https://github.com/UCB-TallerDeDesarrollo/TDDLabBaseProject), revisión `9b7ab49bbee2ecc4824eb179993efcbf80796808`.
- Aplicación: [Alee053/PerdiU](https://github.com/Alee053/PerdiU), revisión `38adf3435c035186125de6b6c4682bed7c41a385`, que incluye la preparación de colaboración y CI.
- Destino: [Alee053/perdi-u](https://github.com/Alee053/perdi-u), creado mediante la función de plantilla de GitHub; rama de integración `main`.

Los historiales originales se conservan por merge, sin reescribir los commits compartidos. La carpeta local de TDDLab pasa a llamarse `perdi-u`; `origin` apunta al repositorio nuevo. Los remotos `tddlab` y `perdiu-legacy` permiten consultar los orígenes y tienen los pushes deshabilitados localmente. El repositorio anterior de PerdiU conserva sus issues, PRs y configuración remota; no se transfieren automáticamente al nuevo.

## Integración

Los archivos originales de `script/`, los tres hooks de `.husky/`, `semantic-commits.js` y `.gitattributes` se conservan byte por byte. Las pruebas anteriores mantienen sus casos y expectativas y se ejecutan con Jest 29.7. Las comparaciones de datos procedentes de `Response.json()` usan `expect(...).toStrictEqual(...)` para comparar correctamente objetos de los contextos de ejecución de Jest y Node.

Las pruebas HTTP usan la API compilada por TypeScript, conservando los decoradores y metadata de NestJS. La estructura de workspaces, el código de la aplicación, SQL, migraciones y fixtures se mantienen. Se retira la calculadora de ejemplo y su configuración de Parcel/Cypress; la aplicación usa Vite y la aceptación existente de Playwright. pnpm es el único gestor y `pnpm-lock.yaml` el único lockfile.

`pnpm install --frozen-lockfile` instala Husky mediante `prepare`. `.npmrc` habilita ESM para Jest tanto en pnpm como en el `npx jest` utilizado por el hook original. `scripts/run-tdd.mjs` invoca el recorder original sin editarlo, descarta reportes temporales anteriores y conserva el fallo del comando cuando las pruebas fallan o no se ejecutan.

La documentación activa usa el nombre nuevo y `main`. Los enlaces a issues y evidencias históricas siguen apuntando al repositorio que las contiene. Las protecciones de rama, colaboradores e integraciones de despliegue del repositorio anterior no se configuran automáticamente como parte de esta migración.

## Verificación

Los casos de `scripts/test/tdd-command.test.mjs` crean repositorios temporales con los scripts y hooks originales, Jest real y dependencias ya instaladas. Comprueban un rojo por una respuesta incorrecta, el verde después de corregirla, sus JSON, códigos de salida, cobertura, inclusión automática de evidencia y resolución de `HEAD` en dos commits consecutivos. También comprueban que un reporte verde anterior no convierte una ejecución sin pruebas en éxito. Esos ejemplos quedan en entornos temporales, separados de la evidencia de desarrollo real.

| Comprobación                                                              | Resultado                                                            |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Pruebas unitarias y del repositorio con Jest                              | 28 pruebas aprobadas.                                                |
| `pnpm verify` (formato, documentación, límites, tipos, unitarias y build) | Aprobado.                                                            |
| PostgreSQL, HTTP y navegador con `pnpm test:e2e`                          | 4 escenarios de integración y aceptación móvil/escritorio aprobados. |
| Typecheck de todos los workspaces                                         | Aprobado.                                                            |
| Comparación de instrumentación con la plantilla                           | Archivos originales idénticos.                                       |

Las comprobaciones de instalación limpia y publicación se registran después de ejecutarse. El funcionamiento académico del evaluador externo se confirma al conectar este repositorio con el mecanismo utilizado por la materia; esta migración verifica los archivos y el flujo local de la plantilla.

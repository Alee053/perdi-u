# Extracción de persistencia y separación de responsabilidades

Verificación del 15 de octubre de 2026 sobre `master`, después de integrar S1-02 en `620822e`. Se separaron `catalog`, `database` y API según la [guía de arquitectura](../architecture.md), conservando contratos HTTP, esquema y datos existentes.

## Comprobaciones

- `pnpm install --offline`: workspaces enlazados con las versiones ya disponibles, sin añadir librerías externas.
- `pnpm test`: 18 pruebas aprobadas; 4 de catálogo, 4 de configuración de BD, 1 HTTP/configuración y 9 web.
- `pnpm typecheck`: los cinco workspaces sin errores.
- `pnpm build`: los cinco workspaces compilados; también ejecutado por aceptación.
- `pnpm test:integration`: PostgreSQL 17 desechable; una prueba de migraciones y tres de HTTP/configuración, todas aprobadas.
- `pnpm test:e2e`: migraciones, HTTP, build y recorrido API/web/Chromium en escritorio y móvil aprobados. Incluye búsqueda, filtros, privacidad, errores/reintento, guardados y límite.
- `pnpm check:boundaries`: grafo permitido y exports públicos verificados. Pruebas diagnósticas temporales confirmaron que rechaza importar BD desde web, rutas privadas entre apps e imports de `dist` no exportados; los archivos diagnósticos se retiraron.
- Desarrollo: un diagnóstico temporal reprodujo que `tsx watch` no reaccionaba a cambios de los paquetes extraídos. Se añadieron globs explícitos de `catalog`, `database` y `contracts`; se comprobó el reinicio del consumidor al cambiar cada build y se retiraron los procesos/archivos del diagnóstico.

## Persistencia y compatibilidad

Se comprobó que `001_catalog.sql` conserva exactamente los bytes de la migración anterior. Se mantiene `schema_migrations` con versión 1 y el identificador del bloqueo transaccional; el runner nuevo no exige recrear la BD ni ejecuta de nuevo versiones aplicadas.

La prueba de migraciones falló inicialmente porque el runner seguía ejecutando únicamente el archivo fijo del catálogo. Después de implementar el descubrimiento se verificaron orden de aplicación, idempotencia, incorporación de otra versión, rollback de una migración fallida y reintento. También se rechazan versiones duplicadas, nombres inválidos y archivos ausentes de versiones aplicadas.

La aceptación HTTP ejecuta los comandos raíz `pnpm db:migrate` y `pnpm db:seed` contra la base desechable, con `PORT` deliberadamente inválido. Así se comprueba la composición Turbo/CLI sin dependencia de configuración HTTP. Las mutaciones conservan la restricción de destino local y la prohibición de producción; ninguna prueba modifica una BD de desarrollo o compartida.

No se cambió la interfaz visual, el modelo de datos ni el comportamiento del catálogo. La separación del estado demo acumulado en `App.tsx` queda como seguimiento al implementar esos flujos, descrito en la guía de arquitectura.

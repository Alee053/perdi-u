# @perdiu/database

Único dueño de PostgreSQL: conexión, adapter SQL del catálogo, migraciones, seed y mantenimiento local. No depende de NestJS ni React. Implementa el puerto definido por `@perdiu/catalog`.

## Uso

- `@perdiu/database`: `openDatabase(databaseUrl)` entrega `reports` (lectura y publicación), `publisher`, `profiles` (nombre y foto de un perfil, sin contactos), `sessions` (revocaciones de sesión persistidas) y `close()`. También exporta `createPool`, `PostgresReportRepository`, `PostgresProfileRepository` y `PostgresSessionRevocations` para integración y herramientas de BD.
- `@perdiu/database/config`: validación de `DATABASE_URL`, error de configuración seguro y `assertLocalDatabase`.
- `@perdiu/database/maintenance`: `migrate(pool)` y `seed(pool)` para bases aisladas; no se ejecutan al iniciar la API.

El CLI carga el `.env` ignorado de la raíz respetando variables de entorno ya definidas. No requiere `PORT`. Valida la URL y limita mutaciones a localhost, bases `perdiu_*dev`/`perdiu_*test`, sin parámetros de URL ni fragmento, fuera de `NODE_ENV=production`. Los consumidores programáticos de mantenimiento deben validar el destino antes de entregar un pool; las pruebas exigen además el indicador de contenedor aislado.

Desde la raíz:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Turbo compila las dependencias antes del mantenimiento, propaga `DATABASE_URL`/`NODE_ENV` y nunca cachea mutaciones. Compose sigue en la raíz: PostgreSQL 17, puerto local 5433 y volumen persistente. `pnpm db:down` conserva el volumen.

## Base de Auth

[`auth/bootstrap.sql`](auth/bootstrap.sql) prepara el mismo cluster para Supabase Auth: rol `perdiu_auth` sin privilegios administrativos, base `perdiu_auth` con su esquema `auth` y el rol `postgres` `NOLOGIN` que exigen las migraciones de GoTrue. Lo ejecuta el servicio Compose `auth-db-init` en cada `pnpm db:up`; es idempotente y no toca `perdiu_dev`. El esquema `auth` pertenece a GoTrue: sus migraciones corren al iniciar Auth y no se versionan aquí. Ver la [guía de Auth](../../docs/auth.md).

## Migraciones y seed

Los archivos viven en `migrations/`, con nombres como `001_catalog.sql` y `002_nueva_capacidad.sql`. La versión es un entero positivo único de al menos tres dígitos, seguido de un nombre ASCII en minúsculas y guiones bajos. Se ordenan por versión numérica.

El runner mantiene `schema_migrations`, adquiere el mismo bloqueo transaccional del runner anterior, omite versiones aplicadas y ejecuta las pendientes en una transacción. Un fallo revierte sus cambios y registros; una segunda ejecución puede volver a intentarlas. Rechaza nombres SQL inválidos, versiones duplicadas y archivos ausentes de versiones registradas. No detecta ediciones del contenido de archivos ya aplicados: conservarlos intactos y añadir una versión nueva para cada evolución.

`002_session_revocations.sql` añade `session_revocations` (`session_id` de Auth revocado y fecha), sin claves foráneas hacia la base de Auth. `003_report_pet_species.sql` añade la especie opcional para reportes de mascotas. `001_catalog.sql` y el registro de versión 1 se conservan sin cambios en la extracción; no se necesita recrear la base ni borrar volúmenes. El seed ficticio está en `seeds/development.sql`, conserva IDs fijos y no sobrescribe registros existentes.

## Verificación

`pnpm test:integration` ejecuta primero las pruebas de migraciones de este paquete y luego el recorrido HTTP. `pnpm test:e2e` añade API, web y Chromium sobre el mismo contenedor desechable. Los fixtures compartidos viven en `test/fixtures/`; no forman parte del seed de desarrollo.

# Responsabilidades del monorepo

Cada workspace es responsable de una capacidad y se consume por sus exports públicos. Los cambios de una capa se prueban en su propia interfaz; las pruebas HTTP y de navegador verifican la composición completa.

| Workspace            | Responsabilidad                                                                                                                                                                                                    | Dependencias internas permitidas   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `apps/web`           | SPA React/Vite organizada en MVP: `models`, `presenters`, `views`, adapters en `infrastructure` (HTTP, Supabase Auth tras `AuthGateway`) y composición en `app`.                                                   | `contracts`                        |
| `apps/api`           | NestJS, entrada HTTP, validación de parámetros/archivos, traducción de errores, verificación de access tokens/guard, configuración R2 y composición de dependencias.                                               | `catalog`, `database`, `contracts` |
| `packages/catalog`   | Modelo y puertos de catálogo/publicación/medios/detalle, casos de uso, validación, asociación de fotos, orden, acceso a resueltos, contacto WhatsApp y proyección pública. Independiente de HTTP, SQL, R2 y React. | `contracts`                        |
| `packages/database`  | Conexión PostgreSQL, adapters SQL de catálogo/publicación/medios/detalle, perfiles y revocaciones de sesión, esquema, migraciones, seed, configuración de BD y CLI de mantenimiento.                               | `catalog`, `contracts`             |
| `packages/contracts` | DTOs, tipos y constantes compartidos. Independiente de los demás workspaces y de frameworks.                                                                                                                       | Ninguna                            |

La API combina `ListReports`, `GetReport` y `GetReportContact` con `openDatabase().reports` y `CreateReport` con `openDatabase().publisher` y el caso de uso de medios con `openDatabase().media` y un adapter R2 opcional; llama `close` al apagar. `GetReport` entrega activos a cualquiera y un resuelto solo a su propietario verificado; `GetReportContact` aplica esa misma regla antes de leer el teléfono privado y lo normaliza para WhatsApp. También recibe un `AccessTokenVerifier` que valida tokens de Supabase Auth con su JWKS público; la API lo combina con las revocaciones de `openDatabase().sessions`, de modo que el guard rechaza sesiones cerradas en toda ruta privada; Auth es un servicio externo de Compose con base propia (`perdiu_auth`), no un workspace. Consultar la [guía de Auth](auth.md). El paquete de base de datos administra el pool, comprueba la conexión e implementa los puertos. Los casos de uso conservan la validación y reglas del catálogo; la respuesta aplica una proyección pública explícita.

## Reglas para cambios

- Importar paquetes por `@perdiu/<nombre>` o sus subpaths exportados. Mantener los imports relativos dentro del mismo workspace. Los scripts de aceptación consumen el paquete de BD; no importan archivos de `apps/api/dist`.
- Colocar SQL de producción, migraciones y seeds en `database`. Los SQL de preparación/verificación en pruebas de integración son parte de la prueba; no se incorporan al runtime de la API.
- Mantener la configuración HTTP en la API y `DATABASE_URL`/protección de mutaciones en `database`. El CLI de migraciones funciona sin un puerto HTTP válido y sin iniciar NestJS.
- Poner pruebas unitarias junto al workspace que posee el comportamiento. Mantener pruebas del recorrido HTTP en la API y orquestación E2E en `scripts/`.
- Mantener Compose local en la raíz, donde se orquesta el entorno de desarrollo completo. Los contenedores desechables de aceptación también se orquestan desde la raíz. La demo aislada del VPS tiene su Compose independiente en `deploy/vps`, descrito en [despliegue](deployment.md); no cambia el entorno local ni las capas de aplicación.
- Los paquetes compartidos se compilan en watch durante `pnpm dev`; el watcher de la API incluye sus builds para reiniciar cuando cambia una dependencia.
- Crear otro paquete cuando tenga una responsabilidad y consumidores claros. Una carpeta o función pequeña dentro de su dueño actual no requiere otro workspace.

`pnpm check:boundaries` verifica el grafo de workspaces, dependencias de infraestructura prohibidas, independencia de los módulos puros, imports ESM literales entre paquetes mediante exports públicos y, dentro de `apps/web/src`, las capas MVP (`scripts/lib/web-layers.mjs`). Al añadir un workspace, definir su regla en `scripts/check-boundaries.mjs`. Los imports calculados y el contenido semántico de las funciones requieren revisión; este check complementa las pruebas y la revisión de código.

## Hallazgos corregidos

1. Conexión, SQL, migraciones y seed estaban en la API; ahora pertenecen a `database`.
2. El mantenimiento de BD importaba configuración HTTP y validaba `PORT`; ahora usa exclusivamente configuración de BD.
3. El modelo y caso de uso del catálogo compartían workspace con NestJS; ahora están en `catalog`, consumido por la API y el adapter de persistencia.
4. La aceptación de navegador importaba archivos compilados internos de la API y fixtures alojados allí; ahora usa exports públicos de `database` y fixtures SQL de ese paquete.
5. El runner conocía solamente `001_catalog.sql`; ahora descubre versiones ordenadas y conserva el registro existente.
6. `App.tsx` concentraba estado, reglas demo, navegación y efectos del navegador; ahora la web sigue MVP con presenters por responsabilidad. Consultar [la arquitectura MVP](architecture/mvp.md).

`ListOwnReports` y `ResolveReport` consumen el puerto `OwnReportsRepository` de `catalog` a través de `openDatabase().reports`. El caso de uso filtra la identidad y aplica la proyección compartida; el adapter SQL restringe la consulta y comprueba propietario/estado en la propia escritura para asegurar idempotencia concurrente. La API traduce sus resultados a HTTP sin aceptar identidad del cliente. No se añaden tablas ni dependencias.

El dashboard conserva datos demo de resumen y mapa. La publicación, el detalle y «Mis reportes» usan puertos del Model, presenters y adapters HTTP; el historial sigue la sesión verificada y descarta respuestas anteriores al cambiar de cuenta. Tras un cierre confirmado, la composición actualiza historial, detalle, guardados y catálogo conservando la consulta. La publicación sin fotos persiste reporte y contacto; la asociación de medios queda para S1-06. La foto se mantiene privada en R2 y solo se entrega desde la API después de que una transacción la asocia al reporte.

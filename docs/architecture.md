# Responsabilidades del monorepo

Cada workspace es responsable de una capacidad y se consume por sus exports públicos. Los cambios de una capa se prueban en su propia interfaz; las pruebas HTTP y de navegador verifican la composición completa.

| Workspace            | Responsabilidad                                                                                                                           | Dependencias internas permitidas   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `apps/web`           | React, cliente HTTP, presenter y estado de presentación.                                                                                  | `contracts`                        |
| `apps/api`           | NestJS, entrada HTTP, validación de parámetros, traducción de errores y composición/ciclo de vida de dependencias.                        | `catalog`, `database`, `contracts` |
| `packages/catalog`   | Modelo y puerto de repositorio del catálogo, caso de uso, orden, activos y proyección pública. Independiente de HTTP, PostgreSQL y React. | `contracts`                        |
| `packages/database`  | Conexión PostgreSQL, adapter SQL del puerto de catálogo, esquema, migraciones, seed, configuración de BD y CLI de mantenimiento.          | `catalog`, `contracts`             |
| `packages/contracts` | DTOs, tipos y constantes compartidos. Independiente de los demás workspaces y de frameworks.                                              | Ninguna                            |

La API combina `ListReports` con `openDatabase().reports` y llama `close` al apagar. El paquete de base de datos administra el pool, comprueba la conexión e implementa el repositorio. El caso de uso conserva las reglas del catálogo y entrega la proyección pública explícita.

## Reglas para cambios

- Importar paquetes por `@perdiu/<nombre>` o sus subpaths exportados. Mantener los imports relativos dentro del mismo workspace. Los scripts de aceptación consumen el paquete de BD; no importan archivos de `apps/api/dist`.
- Colocar SQL de producción, migraciones y seeds en `database`. Los SQL de preparación/verificación en pruebas de integración son parte de la prueba; no se incorporan al runtime de la API.
- Mantener la configuración HTTP en la API y `DATABASE_URL`/protección de mutaciones en `database`. El CLI de migraciones funciona sin un puerto HTTP válido y sin iniciar NestJS.
- Poner pruebas unitarias junto al workspace que posee el comportamiento. Mantener pruebas del recorrido HTTP en la API y orquestación E2E en `scripts/`.
- Mantener Compose en la raíz, donde se orquesta el entorno local completo. Los contenedores desechables de aceptación también se orquestan desde la raíz.
- Los paquetes compartidos se compilan en watch durante `pnpm dev`; el watcher de la API incluye sus builds para reiniciar cuando cambia una dependencia.
- Crear otro paquete cuando tenga una responsabilidad y consumidores claros. Una carpeta o función pequeña dentro de su dueño actual no requiere otro workspace.

`pnpm check:boundaries` verifica el grafo de workspaces, dependencias de infraestructura prohibidas, independencia de los módulos puros e imports ESM literales entre paquetes mediante exports públicos. Al añadir un workspace, definir su regla en `scripts/check-boundaries.mjs`. Los imports calculados y el contenido semántico de las funciones requieren revisión; este check complementa las pruebas y la revisión de código.

## Hallazgos corregidos

1. Conexión, SQL, migraciones y seed estaban en la API; ahora pertenecen a `database`.
2. El mantenimiento de BD importaba configuración HTTP y validaba `PORT`; ahora usa exclusivamente configuración de BD.
3. El modelo y caso de uso del catálogo compartían workspace con NestJS; ahora están en `catalog`, consumido por la API y el adapter de persistencia.
4. La aceptación de navegador importaba archivos compilados internos de la API y fixtures alojados allí; ahora usa exports públicos de `database` y fixtures SQL de ese paquete.
5. El runner conocía solamente `001_catalog.sql`; ahora descubre versiones ordenadas y conserva el registro existente.

El dashboard conserva por ahora los flujos demo documentados. Su estado compartido sigue en `App.tsx`; separar esos flujos al implementar autenticación/publicación es un seguimiento, sin introducir una arquitectura de estado nueva durante esta extracción.

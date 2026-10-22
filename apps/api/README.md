# API de PerdiU

NestJS con PostgreSQL independiente y consultas parametrizadas mediante `pg`. El arranque carga el `.env` ignorado de la raíz; variables ya definidas en el entorno tienen prioridad. No imprime URLs ni errores crudos de PostgreSQL.

## Catálogo público

`GET /reports` devuelve un array de `ReportSummary` de `@perdiu/contracts`: solo activos, ordenados por `createdAt` descendente e ID ascendente en empates. `type` distingue pérdida/hallazgo y `state` distingue activo/resuelto. `incidentDate` usa `YYYY-MM-DD`; `createdAt` usa ISO UTC con seis decimales, conserva los microsegundos y se genera en PostgreSQL.

El autor público tiene ID (sujeto de Auth), nombre y foto opcional. Los contactos están en tablas privadas; ni esos datos ni claves de almacenamiento se consultan para el catálogo. Una lista vacía devuelve `200 []`; fallos de consulta devuelven `503` con mensaje seguro en español. La lectura del catálogo es pública; el cierre de reportes requiere identidad verificada.

## Reportes propios y cierre

`GET /me/reports` exige el mismo guard que `/me`, responde con `Cache-Control: no-store` y un array de `ReportSummary`. Incluye todo el historial del sujeto verificado: activos y resueltos, sin el límite público de 50, por creación descendente e ID ascendente. `?state=active` o `?state=resolved` filtra antes de devolver los resultados; omitir `state` devuelve ambos. Parámetros desconocidos (incluido `ownerId`), repetidos o estados inválidos reciben `400`. Sin publicaciones devuelve `200 []`. El nombre visible no participa en la propiedad y se mantiene la proyección sin contacto ni claves de almacenamiento.

`PATCH /reports/:id/resolve` no necesita cuerpo. Responde `204` sin contenido al cerrar un reporte propio o repetir un cierre propio ya aplicado. El propietario procede exclusivamente del token verificado; otros campos enviados no cambian autor, tipo ni estado de destino. Un `UPDATE` parametrizado condiciona simultáneamente ID, propietario y `state = active`; solo escribe `state = resolved`. Conserva `type`, fecha de publicación y los demás datos. Repeticiones y solicitudes concurrentes no generan otro cambio en una fila resuelta.

| Situación                                          | Respuesta                         |
| -------------------------------------------------- | --------------------------------- |
| Token ausente, inválido, vencido o sesión revocada | `401`, `WWW-Authenticate: Bearer` |
| Reporte de otro propietario, incluso ya resuelto   | `403`                             |
| UUID válido inexistente                            | `404`                             |
| Identificador mal formado                          | `400`                             |
| Fallo de PostgreSQL o verificación no disponible   | `503` con mensaje seguro          |

La lista y el cierre pasan por `ListOwnReports` y `ResolveReport` de `@perdiu/catalog`; el puerto privado `OwnReportsRepository` lo implementa el adapter PostgreSQL. No hay migraciones nuevas: `state` ya existía. Los resueltos quedan fuera de toda búsqueda pública y permanecen en la lista privada tras reiniciar. Editar, eliminar, reabrir y publicar no se incorporan con este endpoint. Evidencia y dependencias: [S1-08](../../docs/validation/s1-08.md).

## Cuenta autenticada

`GET /me` devuelve `AccountIdentity`: `id` (sujeto verificado de Auth), `email` propio y, si existe su fila en `profiles`, `displayName` y `photoUrl`. Nunca lee contactos privados ni acepta otro ID por parámetros. Responde con `Cache-Control: no-store`. `POST /me/logout` registra el `session_id` verificado del token en `session_revocations` y responde `204`; desde entonces ese token y los renovados de la misma sesión reciben `401` en todas las rutas privadas, también tras reiniciar la API. Si PostgreSQL falla, responde `503` sin aceptar la credencial. `AuthGuard` exige `Authorization: Bearer <access token>` y lo verifica con `jose` contra el JWKS público de Supabase Auth. La verificación rechaza firma, algoritmo distinto de ES256, emisor, audiencia, expiración, rol, `sub`/`session_id` o usuarios anónimos inválidos con `401` y mensaje uniforme (`WWW-Authenticate: Bearer`). Si Auth no entrega sus claves, responde `503` sin aceptar la credencial. La identidad nunca se toma de parámetros, cuerpo ni nombres visibles. `createApplication(databaseUrl, verifier)` recibe el verificador y le añade la consulta de revocaciones de la base; el arranque lo crea con `AUTH_JWKS_URL`, `AUTH_JWT_ISSUER` y `AUTH_JWT_AUDIENCE`. Detalle y límites en la [guía de Auth](../../docs/auth.md).

La API se ocupa de HTTP, validación y composición. `ListReports`, en `@perdiu/catalog`, garantiza activos, orden, límite y proyección pública. El puerto exige que su adapter aplique los predicados de búsqueda antes de limitar resultados; normalización y filtros pertenecen a `PostgresReportRepository`, en `@perdiu/database`. La API abre la base mediante `openDatabase` y registra su cierre al apagar. Consulta las [responsabilidades por workspace](../../docs/architecture.md) y [pruebas por interfaz](../../docs/testing.md).

### Buscar y filtrar

`GET /reports?q=camara&type=lost&category=object&city=La%20Paz` combina todos los filtros con AND. Los parámetros son opcionales; se recortan espacios exteriores y los valores vacíos equivalen a omitir el filtro.

| Parámetro  | Valores y límites                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`        | Hasta 200 unidades UTF-16. Frase literal contenida en título **o** descripción; ignora mayúsculas y marcas diacríticas Unicode U+0300–U+036F mediante NFD. No busca en ciudad, zona ni autor. |
| `type`     | `lost` o `found`.                                                                                                                                                                             |
| `category` | `pet`, `object` o `document`.                                                                                                                                                                 |
| `city`     | Hasta 100 unidades UTF-16. Coincidencia exacta con la ciudad almacenada, por ejemplo `La Paz`.                                                                                                |

Parámetros desconocidos, repetidos, estructurados, demasiado largos, caracteres de control o enumeraciones inválidas devuelven `400` con mensaje seguro. Las longitudes se comprueban antes de recortar espacios. Las comillas, `%`, `_` y barras en `q` se buscan literalmente; todos los valores SQL se parametrizan.

Cada consulta devuelve **como máximo 50 reportes**, después de filtrar y ordenar. La respuesta sigue siendo un array compatible con S1-01; no incluye total ni paginación. Al llegar a 50, la web indica el límite y sugiere ajustar los filtros. Este límite acota la respuesta, no el número de filas que PostgreSQL debe inspeccionar: para volúmenes mayores habrá que evaluar índices/búsqueda y paginación.

Requiere PostgreSQL con codificación UTF8 (incluida en el contenedor del proyecto) para `normalize`; no añade extensiones, migraciones ni cambios de esquema. [Normalización Unicode en PostgreSQL 17](https://www.postgresql.org/docs/17/functions-string.html).

## Desarrollo y validación

Sigue el README de la raíz para preparar PostgreSQL y ejecutar `pnpm dev`. `pnpm --filter @perdiu/api start` ejecuta el build existente; `pnpm --filter @perdiu/api test` prueba configuración HTTP. Las reglas de catálogo se prueban en `@perdiu/catalog`, y configuración/migraciones en `@perdiu/database`. Usa los comandos raíz para que Turbo compile las dependencias antes de pruebas y desarrollo.

`pnpm test:integration` crea un contenedor PostgreSQL desechable con puerto y contraseña efímeros, verifica migraciones, catálogo y el guard de `GET /me` con un JWKS local, y elimina únicamente ese contenedor. `pnpm test:auth` repite el recorrido de sesión contra Supabase Auth real. No requiere una cuenta externa ni modifica la BD de desarrollo. Los comandos raíz de migraciones/seed pertenecen a `@perdiu/database`; sus restricciones y evolución se documentan en [su guía](../../packages/database/README.md).

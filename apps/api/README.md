# API de PerdiU

NestJS con PostgreSQL independiente y consultas parametrizadas mediante `pg`. El arranque carga el `.env` ignorado de la raíz; variables ya definidas en el entorno tienen prioridad. No imprime URLs ni errores crudos de PostgreSQL.

## Catálogo público

`GET /reports` devuelve un array de `ReportSummary` de `@perdiu/contracts`: solo activos, ordenados por `createdAt` descendente e ID ascendente en empates. `type` distingue pérdida/hallazgo y `state` distingue activo/resuelto. `incidentDate` usa `YYYY-MM-DD`; `createdAt` usa ISO UTC con seis decimales, conserva los microsegundos y se genera en PostgreSQL.

El autor público tiene ID (sujeto de Auth), nombre y foto opcional. Los contactos están en tablas privadas; ni esos datos ni claves de almacenamiento se consultan para el catálogo. Una lista vacía devuelve `200 []`; fallos de consulta devuelven `503` con mensaje seguro en español. El catálogo es público y no tiene endpoints de escritura.

## Detalle estable y contacto

`GET /reports/:id` devuelve `ReportDetail` de `@perdiu/contracts`. Valida un ID UUID y permite consultar reportes activos sin sesión. Un reporte resuelto solo se devuelve cuando el token verificado pertenece a su propietario; para el resto de los casos (incluido un ID inexistente) responde `404 Reporte no disponible.`. Un fallo de PostgreSQL responde `503` con un mensaje distinto y seguro. La respuesta usa una allowlist pública, no incluye teléfono, correo ni claves de almacenamiento y lleva `Cache-Control: no-store`. Si no hay fotos, `imageUrls` es un array vacío y la web usa la imagen SVG local de su categoría.

`GET /reports/:id/contact` siempre exige un bearer verificado por `AuthGuard` y vuelve a comprobar que el reporte sea accesible para ese sujeto. Solo entonces consulta el teléfono de `report_contacts`; nunca devuelve el correo del perfil. Devuelve `ReportContact` con el número normalizado para `wa.me`, o `404 El contacto no está disponible.` si falta o no es un celular boliviano válido. Los IDs no válidos devuelven `400`; un fallo de consulta devuelve `503`. La respuesta privada también usa `Cache-Control: no-store`. La API no envía mensajes ni acepta destinos proporcionados por el navegador.

## Cuenta autenticada

`GET /me` devuelve `AccountIdentity`: `id` (sujeto verificado de Auth), `email` propio y, si existe su fila en `profiles`, `displayName` y `photoUrl`. Nunca lee contactos privados ni acepta otro ID por parámetros. Responde con `Cache-Control: no-store`. `POST /me/logout` registra el `session_id` verificado del token en `session_revocations` y responde `204`; desde entonces ese token y los renovados de la misma sesión reciben `401` en todas las rutas privadas, también tras reiniciar la API. Si PostgreSQL falla, responde `503` sin aceptar la credencial. `AuthGuard` exige `Authorization: Bearer <access token>` y lo verifica con `jose` contra el JWKS público de Supabase Auth. La verificación rechaza firma, algoritmo distinto de ES256, emisor, audiencia, expiración, rol, `sub`/`session_id` o usuarios anónimos inválidos con `401` y mensaje uniforme (`WWW-Authenticate: Bearer`). Si Auth no entrega sus claves, responde `503` sin aceptar la credencial. La identidad nunca se toma de parámetros, cuerpo ni nombres visibles. `createApplication(databaseUrl, verifier)` recibe el verificador y le añade la consulta de revocaciones de la base; el arranque lo crea con `AUTH_JWKS_URL`, `AUTH_JWT_ISSUER` y `AUTH_JWT_AUDIENCE`. Detalle y límites en la [guía de Auth](../../docs/auth.md).

La API se ocupa de HTTP, validación y composición. `ListReports` y `GetReport`, en `@perdiu/catalog`, garantizan las reglas del catálogo/detalle, la disponibilidad por estado/propietario y la proyección pública. El puerto exige que su adapter aplique los predicados de búsqueda antes de limitar resultados; normalización y filtros pertenecen a `PostgresReportRepository`, en `@perdiu/database`. El adapter de contactos privados se expone por separado y la API solo lo consulta después de verificar sesión y acceso al reporte. La API abre la base mediante `openDatabase` y registra su cierre al apagar. Consulta las [responsabilidades por workspace](../../docs/architecture.md) y [pruebas por interfaz](../../docs/testing.md).

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

`pnpm test:integration` crea un contenedor PostgreSQL desechable con puerto y contraseña efímeros, verifica migraciones, catálogo, acceso al detalle/contacto y el guard de `GET /me` con un JWKS local, y elimina únicamente ese contenedor. `pnpm test:e2e` añade acceso directo/recarga del detalle en navegador. `pnpm test:auth` repite el recorrido de sesión contra Supabase Auth real. No requiere una cuenta externa ni modifica la BD de desarrollo. Los comandos raíz de migraciones/seed pertenecen a `@perdiu/database`; sus restricciones y evolución se documentan en [su guía](../../packages/database/README.md).

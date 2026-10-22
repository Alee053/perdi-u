# API de PerdiU

NestJS con PostgreSQL independiente y consultas parametrizadas mediante `pg`. El arranque carga el `.env` ignorado de la raíz; variables ya definidas en el entorno tienen prioridad. No imprime URLs ni errores crudos de PostgreSQL.

## Catálogo público

`GET /reports` devuelve un array de `ReportSummary` de `@perdiu/contracts`: solo activos, ordenados por `createdAt` descendente e ID ascendente en empates. `type` distingue pérdida/hallazgo y `state` distingue activo/resuelto. `incidentDate` usa `YYYY-MM-DD`; `createdAt` usa ISO UTC con seis decimales, conserva los microsegundos y se genera en PostgreSQL.

El autor público tiene ID (sujeto de Auth), nombre y foto opcional. Los contactos están en tablas privadas; ni esos datos ni claves de almacenamiento se consultan para el catálogo. Una lista vacía devuelve `200 []`; fallos de consulta devuelven `503` con mensaje seguro en español.

`POST /reports` requiere `Authorization: Bearer <access token>`. El cuerpo lleva tipo, categoría, título, descripción, ciudad, zona, fecha del hecho y WhatsApp; para mascotas también especie. Puede incluir hasta tres `mediaIds` que el mismo dueño subió y todavía no asoció. El servidor toma el autor de la identidad verificada, genera ID/fecha de creación/estado activo y guarda el contacto normalizado en `report_contacts`; asocia las fotos en la misma transacción. Responde con el reporte público y sin el número ni las claves privadas de almacenamiento. Los IDs inválidos, ajenos, repetidos o ya usados devuelven `400`, una sesión ausente o inválida devuelve `401`, y los fallos de persistencia devuelven `503`.

`POST /media` requiere la misma sesión y una parte multipart `file`. La API acepta hasta tres fotos pendientes por dueño, de hasta 5 MiB cada una. Reconoce PNG/JPEG por la firma del contenido, sin confiar en el nombre o MIME declarado. El objeto se guarda privado y la respuesta contiene solo `{ "id": "…" }`. `GET /media/:id` sirve la imagen solo cuando ya está asociada a un reporte; `DELETE /media/:id` borra únicamente una foto propia aún no asociada. Sin variables R2 la API inicia normalmente, pero esas operaciones responden `503`. La configuración opcional completa está en [servicios](../../docs/services.md); la API no crea buckets ni otros recursos.

## Detalle y contacto de un reporte

`GET /reports/:id` devuelve un `ReportSummary` con la misma proyección pública del catálogo. Un reporte activo es público; uno resuelto solo se entrega a su propietario, identificado por el sujeto verificado del token. La ruta acepta visitantes sin `Authorization`, pero una credencial presente pasa el mismo guard que las rutas privadas (`401` si no es válida). Un ID que no es UUID responde `400` («Identificador de reporte inválido.»); un reporte inexistente o no visible para esa persona responde igual, `404` «Reporte no disponible.», para no revelar casos cerrados; un fallo de consulta responde `503`. Siempre usa `Cache-Control: no-store`, porque la respuesta depende de la sesión.

`GET /reports/:id/contact` exige sesión (`AuthGuard`) y aplica la misma regla de acceso antes de leer `report_contacts`. Devuelve `ReportContact`: `{ "available": true, "whatsapp": "59170000001" }` o `{ "available": false }` si no hay teléfono o no es válido. `@perdiu/catalog` quita espacios, guiones y paréntesis y acepta el formato internacional que guarda la publicación (`+` y 8 a 15 dígitos, de cualquier país) o, en datos locales anteriores, un celular boliviano (8 dígitos que empiezan con 6 o 7, con o sin `591`); devuelve solo dígitos, así que ningún valor almacenado cambia el destino de `wa.me`. Responde `404` si el reporte no es accesible, `503` si falla la consulta y `no-store`. El teléfono no aparece en el detalle público ni en el catálogo.

## Historial propio y cierre

`GET /me/reports` exige `AuthGuard` y devuelve un array de `ReportSummary` solo del sujeto verificado. Incluye activos y resueltos, ordenados por creación descendente e ID ascendente, sin el límite público de 50. Acepta únicamente el filtro opcional `state=active|resolved`; parámetros desconocidos, un estado inválido o valores repetidos responden `400`. Sin publicaciones responde `200 []`. No consulta contacto ni almacenamiento privado y usa `Cache-Control: no-store`.

`PATCH /reports/:id/resolve` exige sesión y no toma identidad, tipo ni estado del cuerpo. Devuelve `204` sin cuerpo cuando el autor cierra su reporte o repite un cierre ya aplicado, `401` sin sesión válida, `403` para un reporte ajeno, `404` si no existe y `400` para un ID no UUID. El SQL incluye propietario y estado activo en el `UPDATE`: solo cambia `state`, conserva `type` y las repeticiones concurrentes no producen otra escritura. No requiere migraciones ni añade fechas de cierre artificiales.

Ambas rutas responden `503` con mensajes seguros ante un fallo de persistencia. Un cierre fallido conserva el estado anterior. Los resueltos desaparecen del catálogo y búsquedas, y su detalle sigue accesible solo a su autor. Editar/eliminar, reabrir y expiración permanecen fuera de alcance.

## Cuenta autenticada

`GET /me` devuelve `AccountIdentity`: `id` (sujeto verificado de Auth), `email` propio y, si existe su fila en `profiles`, `displayName` y `photoUrl`. Nunca lee contactos privados ni acepta otro ID por parámetros. Responde con `Cache-Control: no-store`. `POST /me/logout` registra el `session_id` verificado del token en `session_revocations` y responde `204`; desde entonces ese token y los renovados de la misma sesión reciben `401` en todas las rutas privadas, también tras reiniciar la API. Si PostgreSQL falla, responde `503` sin aceptar la credencial. `AuthGuard` exige `Authorization: Bearer <access token>` y lo verifica con `jose` contra el JWKS público de Supabase Auth. La verificación rechaza firma, algoritmo distinto de ES256, emisor, audiencia, expiración, rol, `sub`/`session_id` o usuarios anónimos inválidos con `401` y mensaje uniforme (`WWW-Authenticate: Bearer`). Si Auth no entrega sus claves, responde `503` sin aceptar la credencial. La identidad nunca se toma de parámetros, cuerpo ni nombres visibles. `createApplication(databaseUrl, verifier)` recibe el verificador y le añade la consulta de revocaciones de la base; el arranque lo crea con `AUTH_JWKS_URL`, `AUTH_JWT_ISSUER` y `AUTH_JWT_AUDIENCE`. Detalle y límites en la [guía de Auth](../../docs/auth.md).

La API se ocupa de HTTP, validación y composición. `ListReports`, en `@perdiu/catalog`, garantiza activos, orden, límite y proyección pública; el caso de uso de medios coordina metadatos y almacenamiento detrás de puertos. El puerto de catálogo exige que su adapter aplique los predicados de búsqueda antes de limitar resultados; normalización y filtros pertenecen a `PostgresReportRepository`, en `@perdiu/database`. La API abre la base mediante `openDatabase` y registra su cierre al apagar. Consulta las [responsabilidades por workspace](../../docs/architecture.md) y [pruebas por interfaz](../../docs/testing.md).

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

La [demo en VPS](../../docs/deployment.md) ejecuta este mismo build en un contenedor sin privilegios, detrás de NPM/gateway y las rewrites de Vercel; no cambia rutas HTTP ni habilita CORS. El healthcheck consulta el catálogo real para comprobar también PostgreSQL.

`pnpm test:integration` crea un contenedor PostgreSQL desechable con puerto y contraseña efímeros, verifica migraciones, catálogo y el guard de `GET /me` con un JWKS local, y elimina únicamente ese contenedor. `pnpm test:auth` repite el recorrido de sesión contra Supabase Auth real. No requiere una cuenta externa ni modifica la BD de desarrollo. Los comandos raíz de migraciones/seed pertenecen a `@perdiu/database`; sus restricciones y evolución se documentan en [su guía](../../packages/database/README.md).

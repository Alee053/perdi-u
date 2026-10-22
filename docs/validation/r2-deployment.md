# Correcciones y despliegue de fotos R2

Revisión y preparación del 22 de octubre de 2026, relacionada con #6.

## Evidencia TDD

Ejecuciones originales de `pnpm test` en Node 24.22.0, conservadas en `script/tdd_log.json`. Los seis criterios comparten `testId` 47 y se implementaron secuencialmente.

| Criterio                                                        | testId | Rojo: timestamp y fallo | Verde: timestamp y resultado | Refactor     |
| --------------------------------------------------------------- | ------ | ----------------------- | ---------------------------- | ------------ |
| Visibilidad de fotos resueltas antes de consultar R2            | 47     | 1792650565470: 1 fallos | 1792650595648: 134 aprobadas | No necesario |
| Cancelación de publicación al abandonar o resetear              | 47     | 1792650629603: 2 fallos | 1792650662493: 136 aprobadas | No necesario |
| Lectura con bearer sin enviar tokens a otros destinos           | 47     | 1792650704027: 2 fallos | 1792650737364: 138 aprobadas | No necesario |
| Liberación de fotos privadas y descarte de respuestas obsoletas | 47     | 1792650764302: 1 fallos | 1792650804165: 139 aprobadas | No necesario |
| Eliminación concurrente por identidad estable                   | 47     | 1792651042237: 1 fallos | 1792651064326: 140 aprobadas | No necesario |
| Todas las fotos visibles en el detalle y respaldo sin fotos     | 47     | 1792651084731: 1 fallos | 1792651127508: 141 aprobadas | No necesario |

## Alcance y comprobación

El Compose entrega las cuatro variables opcionales exclusivamente a la API. El gateway permite 6 MiB por petición; el límite de archivo permanece en 5 MiB. La lectura de imágenes usa el estado y propietario del reporte, y el formulario deja de publicar después de salir durante una subida.

La publicación sin fotos ya estaba implementada: se verificó inicialmente con PostgreSQL aislado y navegador con Auth real. El VPS ejecutaba una versión anterior, sin publicación persistente ni R2; el merge no actualiza el backend automáticamente.

El detalle muestra todas las fotos asociadas. La prueba de navegador de tres fotos privadas antes/después de recargar dobla únicamente la respuesta binaria de la imagen y comprueba que se envía bearer. La integración HTTP/PostgreSQL verifica la autorización antes de acceder al doble de storage. La aceptación del proveedor real y los SHA desplegados se registran al ejecutar el despliegue; un test con dobles no la sustituye.

La primera aceptación de catálogo falló al esperar un botón de reintento después de reiniciar la API: el test esperaba cualquier alerta, incluida Auth, antes de que el catálogo fallara. Se cambió la espera al estado de error del catálogo antes de reiniciar y se mantiene la comprobación explícita del reintento.

## Validación local final

- `pnpm verify`: aprobado, 141 pruebas unitarias, formato, documentación, límites MVP, tipos y build.
- `pnpm test:e2e`: aprobado con PostgreSQL aislado y Chromium, incluido error/reintento después de reiniciar API.
- `pnpm test:auth --with-browser`: aprobado con GoTrue, PostgreSQL y Chromium reales; publicación sin fotos y tres imágenes privadas visibles antes y después de recargar en móvil/escritorio. Un intento previo terminó con timeout al buscar el campo de contraseña; al repetir aisladamente pasó. No se atribuye ese timeout a una causa de aplicación demostrada.
- Revisión independiente de estándares y criterios: corregidas la eliminación concurrente por índice y la pérdida de imágenes adicionales en el detalle, sin pendientes en esos hallazgos.

## Verificación de R2 y del VPS

Backend construido y desplegado desde `b203c153276f7afc8f39d3e1fdcf31882cbf2dda` en `tars-vps:/opt/stacks/perdi-u`. Se conservó `.env` con modo `600`; el proceso de API confirmó las cuatro variables presentes sin imprimirlas. La configuración, base y anterior imagen quedaron respaldadas antes de actualizar. PostgreSQL, Auth, API, gateway y Mailpit terminaron saludables; migración y bootstrap finalizaron correctamente. Se comprobaron las versiones 1, 2, 3 y 4 de `schema_migrations`.

Con el adapter real del contenedor y un objeto efímero privado de 5 MiB se verificaron `put`, `get`, igualdad SHA-256, otra lectura después de cerrar/recrear el cliente S3, `delete` y ausencia posterior con 404. El objeto quedó eliminado. Esto verifica el proveedor y sus credenciales, no una publicación de usuario de extremo a extremo en producción.

Se comprobaron ambos orígenes HTTPS, backend y Vercel: catálogo 200, historial sin sesión 401, medio inexistente 404, Auth health 200 y publicación sin sesión 401. Un multipart anónimo con archivo de 5 MiB recibió 401 en ambos, confirmando que llegó a la autenticación de la API y no fue rechazado por tamaño en los proxies. Las pruebas de publicación autenticada, persistencia y lectura de fotos antes/después de reiniciar usan PostgreSQL aislado; la aceptación de navegador del detalle usa el binario de storage doblado, como se explicó arriba.

La sincronización del frontend de producción depende del merge de la PR #23. La protección de `main` exige los checks `quality` y `acceptance` y una aprobación de otra persona; el backend se actualizó antes del merge por autorización del propietario.

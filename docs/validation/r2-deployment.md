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

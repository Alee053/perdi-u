# Documentación de producto

| Documento                                                     | Uso                                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [Informe de producto](informe.md)                             | Visión, alcance original, comunidad, riesgos, infraestructura y 18 historias con criterios; tabla anónima de pruebas de usuario. |
| [Mapa de historias](mapa-de-historias.md)                     | Releases originales por actividad, legibles en GitHub.                                                                           |
| [CSV original](../USM_LostFoundBolivia.csv)                   | Fuente editable del mapa; se conserva su nombre histórico.                                                                       |
| [Especificación histórica de la demo](demo-historica.md)      | Referencia de la entrega frontend; no define el alcance actual del backend.                                                      |
| [PerdiU Backlog](https://github.com/users/Alee053/projects/5) | Historias y estados vigentes del equipo.                                                                                         |

## Fuentes y actualización

Los Markdown se extrajeron del informe PDF local el 2026-10-15. El original tiene 27 páginas y SHA-256 `dc5f994b71c19ddde9f5f1feaa9e6efe0e42e77d3d8d3f4f1480ce808802b03f`.

Se conservaron las palabras del cuerpo funcional de las páginas 2-15 y de la especificación de la demo en las páginas 16-23; se normalizaron encabezados, listas y saltos de línea. La tabla de la página 27 se transcribió y cotejó visualmente. Se omitieron portada, imágenes de pruebas de usuario y notas de autoría. El PDF original se conserva local y está ignorado por Git; no se distribuyen sus imágenes ni se añade el binario de 13 MB al repositorio.

A partir de esta extracción, los Markdown son la versión editable y revisable en Git. Cambiar requisitos exige actualizar la issue afectada y explicar la decisión; no regenerar encima de ediciones posteriores sin revisar el diff. El PDF queda como referencia de origen.

## Diferencias conocidas

- Las releases del CSV no equivalen al sprint de dos semanas. El sprint se define en sus issues, no copiando toda la primera release.
- El informe incluye Documentos en el alcance general, pero algunas historias y el CSV solo mencionan Mascota/Objeto. El contrato actual permite `pet | object | document`; conservar esa diferencia histórica al consultar las fuentes.
- La versión de demo llama «estado» a Perdido/Encontrado. El contrato actual separa `type = lost | found` de `state = active | resolved`; resolver un hallazgo conserva su tipo.
- El mapa real y la moderación aparecen en el informe inicial, pero su presencia en ese documento no los incluye automáticamente en S1-01 ni en el sprint actual.
- La expiración aparece como pendiente en el original. No inventar un vencimiento mientras no exista una decisión aprobada.
- La infraestructura descrita para el prototipo es histórica. La base actual es NestJS + PostgreSQL independiente; las integraciones pendientes se detallan en las issues del sprint.

Ante contradicciones, revisar la issue y los contratos vigentes; si el cambio altera comportamiento, permisos o alcance, acordarlo antes de implementarlo y actualizar ambas referencias.

# Consolidación de GitHub en perdi-u

El 17 de octubre de 2026 se consolidan código, historial y seguimiento en [Alee053/perdi-u](https://github.com/Alee053/perdi-u), manteniendo su procedencia de TDDLabBaseProject. El propietario autorizó retirar el repositorio `Alee053/PerdiU`, su carpeta local y el worktree anterior de Orca, con respaldo privado. La reconexión de Vercel se pospone por decisión expresa; esta consolidación no modifica el proyecto de Vercel.

## Issues y proyecto

Las 9 issues se transfirieron con la función nativa de GitHub. Se verificaron título, cuerpo, estado y motivo de cierre, fecha original de cierre, comentarios, responsables, etiquetas y milestone frente a la exportación anterior.

| Issue anterior | Issue actual                                                                     | Estado conservado  |
| -------------- | -------------------------------------------------------------------------------- | ------------------ |
| #1             | [#1: catálogo](https://github.com/Alee053/perdi-u/issues/1)                      | Closed / completed |
| #2             | [#2: búsqueda y filtros](https://github.com/Alee053/perdi-u/issues/2)            | Closed / completed |
| #3             | [#3: acceso con Google](https://github.com/Alee053/perdi-u/issues/3)             | Open               |
| #4             | [#4: perfil y logout](https://github.com/Alee053/perdi-u/issues/4)               | Open               |
| #5             | [#5: publicar reportes](https://github.com/Alee053/perdi-u/issues/5)             | Open               |
| #6             | [#6: fotos](https://github.com/Alee053/perdi-u/issues/6)                         | Open               |
| #7             | [#7: detalle y WhatsApp](https://github.com/Alee053/perdi-u/issues/7)            | Open               |
| #8             | [#8: reportes propios y resolución](https://github.com/Alee053/perdi-u/issues/8) | Open               |
| #11            | [#9: colaboración y calidad](https://github.com/Alee053/perdi-u/issues/9)        | Closed / completed |

Se conserva el mismo [PerdiU Backlog, proyecto 5](https://github.com/users/Alee053/projects/5), con los mismos 9 identificadores de tarjeta, orden, estados, prioridades, tamaños y estimaciones. El proyecto queda vinculado a `perdi-u` y sus enlaces apuntan a las issues actuales. Las historias #1 y #2 y la preparación de colaboración siguen en Done; las otras seis historias siguen en Ready. No se crearon tickets ni tarjetas duplicados.

La etiqueta `sprint-1` y el milestone `Sprint 1 · Versión básica funcional de PerdiU` se crearon antes de transferir, conservando sus propiedades. No había relaciones nativas de bloqueo, jerarquía ni subissues que trasladar.

## Pull requests históricas

Las tres PRs anteriores ya estaban integradas. Sus commits permanecen en el historial; sus registros de GitHub se exportaron al respaldo privado con conversación, revisiones, comentarios de revisión, archivos, commits y timeline. No se recrean como PRs nuevas ni se les atribuyen aprobaciones nuevas.

| PR anterior | Cambio                   | Rama archivada en el destino                    |
| ----------- | ------------------------ | ----------------------------------------------- |
| #9          | Catálogo S1-01           | `archive/perdiu/s1-01-catalog`                  |
| #10         | Búsqueda y filtros S1-02 | `archive/perdiu/feat/s1-02-busqueda-reportes`   |
| #12         | Colaboración y calidad   | `archive/perdiu/chore/11-preparar-colaboracion` |

`archive/perdiu/master` conserva la punta publicada del repositorio anterior, `38adf3435c035186125de6b6c4682bed7c41a385`. Las cuatro ramas archivadas coinciden con los SHA originales. Son referencias históricas; el trabajo nuevo parte de `main` y conserva el seguimiento TDDLab.

La issue actual #9 no es la antigua PR #9. Al interpretar referencias anteriores, consultar el tipo de objeto y esta tabla.

## Colaboración y protección

Se enviaron invitaciones con permiso de escritura a los tres colaboradores anteriores: `Santiamen23`, `sebas123312231` y `AmiraDelRocioChoqueCarrasco`. El acceso se activa cuando cada persona acepta su invitación.

La política de `main` replica la protección de `master`: checks `quality` y `acceptance` con rama actualizada, una aprobación, descarte de aprobaciones obsoletas y resolución de conversaciones. También se aplica a administradores y no permite force-push ni borrado de la rama. La guía [CONTRIBUTING.md](../../CONTRIBUTING.md) define el flujo del trabajo nuevo.

## Respaldo y límites

El respaldo privado conserva la carpeta Git anterior completa, un bundle verificado con todas las referencias locales, el worktree de Orca archivado y comprobado por contenido, y las exportaciones de GitHub/Projects anteriores y posteriores a la transferencia. El PDF original se copió a `docs/PERDI U.pdf`, sigue ignorado y coincide byte por byte con su fuente.

Las copias no se publican en el repositorio. La carpeta activa es `perdi-u`; el remoto `origin` apunta al destino y `tddlab` conserva acceso de lectura a la plantilla. La eliminación de GitHub es una operación posterior a estas verificaciones; el resultado de esa operación se registra en el manifiesto privado del respaldo.

Vercel queda pendiente de reconexión: los cambios nuevos no se despliegan mediante la conexión antigua. No se migraron credenciales, no se aprovisionaron servicios y no se modificaron bases de datos.

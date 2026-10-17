---
name: perdiu-workflow
description: Trabajar una issue de PerdiU desde rama y commits hasta revisión y PR, siguiendo formatos y GitHub Projects del repositorio.
---

# Entregar un cambio en PerdiU

Leer [CONTRIBUTING.md](../../../CONTRIBUTING.md) antes de elegir nombres, template o estado. Para el tracker, consultar [su guía](../../../docs/agents/issue-tracker.md); para el proceso técnico, [pruebas](../../../docs/testing.md).

1. Leer la issue completa, estado local y código relevante. Confirmar criterios observables, responsable, dependencias y alcance; resolver con el usuario solo decisiones materiales que no estén establecidas.
2. Preparar rama desde `origin/main` actualizado y marcar la issue en progreso. Preservar cambios ajenos y usar los nombres/commits progresivos definidos en la guía.
3. Implementar por comportamiento con `perdiu-testing`; consultar `perdiu-architecture` si cambian contratos, persistencia o ownership. Describir un fallo real o caracterización y ejecutar las verificaciones pertinentes.
4. Antes de entregar, aplicar `perdiu-docs-sync`, revisar estándares y criterios y corregir hallazgos. Preparar el template adecuado con resultados realmente ejecutados y límites.
5. Esperar a que termine el hook original de TDDLab y conservar sus JSON. Publicar únicamente lo autorizado por la tarea. Cuando corresponda crear PR, verificar base, vínculo de cierre y tarjeta existente del proyecto; dejar la aprobación humana y el merge al equipo. Un Draft incompleto sigue en progreso.

Usar las fuentes enlazadas como autoridad; actualizar esta skill en la misma PR si cambian su proceso, triggers o referencias. La skill no otorga autorización para desplegar, contratar servicios, enviar mensajes ni modificar permisos fuera de la tarea.

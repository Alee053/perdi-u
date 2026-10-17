---
name: perdiu-architecture
description: Ubicar cambios de PerdiU por responsabilidad cuando afectan contratos, persistencia, exports, dependencias o distribución entre workspaces.
---

# Elegir el dueño del cambio

Leer [arquitectura](../../../docs/architecture.md), el código/exports afectados y [servicios](../../../docs/services.md). Para dominio, seguir [su índice](../../../docs/agents/domain.md).

1. Identificar qué comportamiento cambia y quién lo posee. Mantener HTTP/composición, reglas de catálogo, persistencia y presentación en los workspaces definidos; verificar callers y tipos antes de mover código.
2. Consumir exports públicos y respetar el puerto de catálogo: sus predicados pertenecen al adapter y sus garantías adicionales al caso de uso. Mantener proyección pública explícita e identidad verificada; el nombre no demuestra propiedad.
3. Para persistencia, leer [la guía de database](../../../packages/database/README.md). Añadir migraciones nuevas sin editar las aplicadas y probar solo en bases aisladas. Mantener configuración/credenciales del lado correspondiente.
4. Elegir la solución más pequeña que preserve contratos. Crear otro paquete o proveedor solo con responsabilidad y necesidad claras; acordar decisiones que alteren arquitectura, permisos, datos o costo.
5. Ejecutar `pnpm check:boundaries` y pruebas del recorrido. Actualizar la guía y esta skill si cambian responsabilidades, garantías o referencias; `perdiu-docs-sync` indica qué más revisar en la misma PR.

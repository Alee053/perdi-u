# PerdiU

Repositorio: [Alee053/perdi-u](https://github.com/Alee053/perdi-u), creado desde la plantilla [TDDLabBaseProject](https://github.com/UCB-TallerDeDesarrollo/TDDLabBaseProject). El contenido, historial y las 9 issues anteriores están incorporados. La [consolidación de GitHub](docs/validation/github-consolidation.md) documenta la numeración y el respaldo de las PRs históricas.

PerdiU conecta a personas que perdieron algo con quienes lo encontraron. Este monorepo usa pnpm workspaces y Turborepo para coordinar la web, la API y los contratos compartidos.

## Colaboración y documentación

Para abrir una PR, seguir [CONTRIBUTING.md](CONTRIBUTING.md): nombres de ramas/commits/PRs, templates por tipo, vínculo `Closes`/`Refs`, estados de GitHub Projects y revisión. Los [documentos de producto](docs/product/README.md) reúnen el informe y mapa de historias en formatos revisables en Git. El trabajo vigente está en [PerdiU Backlog](https://github.com/users/Alee053/projects/5).

## Requisitos

- Node.js 24 LTS, versión de [`.node-version`](.node-version), para desarrollo y CI. Usar el gestor de versiones preferido sin cambiar la configuración global de otros proyectos.
- pnpm 10.29.2, fijado en `packageManager`.
- Docker con Compose para PostgreSQL local y pruebas de integración.
- `gh` autenticado para issues, Projects y PRs; Chromium/Playwright para aceptación. En Windows, usar WSL2 con acceso al daemon Docker; CI corre en Linux.

## Desarrollo

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

En `.env`, define una contraseña local en `POSTGRES_PASSWORD` y una `DATABASE_URL` con el formato `postgresql://perdiu:<contraseña-codificada>@127.0.0.1:5433/perdiu_dev`. Codifica los caracteres especiales de la contraseña para la URL. Ejecuta `pnpm auth:keys` y copia sus tres líneas (`AUTH_DB_PASSWORD`, `AUTH_JWT_SECRET`, `AUTH_JWT_KEYS`) al mismo archivo. El archivo está ignorado por Git; las credenciales de BD y las claves de Auth pertenecen a procesos de servidor. La [guía de servicios](docs/services.md) detalla configuración actual y proveedores pendientes; no necesitas R2 para el catálogo.

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

La web corre en `http://localhost:5173` y la API en `http://127.0.0.1:3000`. `pnpm db:up` también inicia Supabase Auth (`127.0.0.1:9999`) y Mailpit (`http://127.0.0.1:8025`), donde se leen los correos de confirmación locales. También puedes usar `pnpm dev:web` con la API iniciada por separado. `pnpm db:down` detiene los servicios conservando el volumen.

## Autenticación

Registro, inicio y cierre de sesión con correo y contraseña mediante Supabase Auth (GoTrue) self-hosted sobre el mismo PostgreSQL, en la base separada `perdiu_auth`. La API valida los JWT ES256 con las claves públicas de Auth, expone `GET /me` y revoca la sesión actual con `POST /me/logout`; «Publicar reporte», «Mis reportes» y «Mi perfil» requieren sesión. Consulta la [guía de Auth](docs/auth.md) para el flujo, la configuración, la seguridad y cómo probarlo.

`pnpm build` y `pnpm typecheck` recorren los workspaces con Turbo, compilando primero sus dependencias. `pnpm test` ejecuta las pruebas con Jest y registra cada ejecución mediante TDDLab. Los hooks se instalan automáticamente con `pnpm install --frozen-lockfile`. `pnpm verify` reúne formato, documentación/skills, arquitectura, tipos, unitarias y build. La caché de builds es local; las pruebas se ejecutan realmente en cada invocación, sin reutilizar resultados de Turbo.

La interfaz abre directamente en un dashboard. La barra lateral separa Resumen, Explorar reportes, Mapa, Publicar reporte, Mis reportes, Guardados y Seguridad y privacidad.

## Estructura de la interfaz

La aplicación web sigue Model–View–Presenter; la [guía MVP](docs/architecture/mvp.md) explica capas, flujo y pruebas.

- apps/web/src/models: entidades, reglas y puertos, sin React ni navegador.
- apps/web/src/presenters: estado de presentación por funcionalidad y adaptadores React `use*.ts`.
- apps/web/src/views: páginas, layouts (barra lateral, encabezado) y componentes reutilizables.
- apps/web/src/infrastructure: clientes HTTP, Supabase Auth, efectos del navegador y datos demo.
- apps/web/src/app: entrada y composición de dependencias.

## Workspaces

- `apps/web`: interfaz React/TypeScript/Vite con catálogo real y otras secciones de demostración.
- `apps/api`: catálogo público NestJS con persistencia en PostgreSQL independiente.
- `packages/contracts`: tipos compartidos para los reportes y perfiles públicos.
- `packages/catalog`: modelo, puerto de repositorio y caso de uso del catálogo, independientes de frameworks y de la base de datos.
- `packages/database`: PostgreSQL, conexión, adapter SQL, migraciones, seed y CLI local. Consulta su [guía](packages/database/README.md).

La [guía de arquitectura](docs/architecture.md) define responsabilidades y dependencias. `pnpm check:boundaries` comprueba imports entre workspaces y sus exports públicos. Los paquetes compartidos se recompilan en modo watch con `pnpm dev`.

«Explorar reportes» consulta `GET /reports` de PostgreSQL a través del proxy `/api` de Vite. La búsqueda por título/descripción ignora mayúsculas y tildes y se combina en el servidor con tipo, categoría y ciudad. Cada consulta devuelve hasta 50 reportes activos, del más reciente al más antiguo; al alcanzar el límite, la interfaz sugiere ajustar los filtros. «Limpiar filtros» restablece el catálogo y los controles; las consultas anteriores se cancelan y sus respuestas se descartan. Distingue carga, error con reintento de la misma búsqueda, catálogo vacío y búsqueda sin coincidencias con acceso a publicación. No usa datos demo como fallback. El detalle abierto desde este catálogo muestra únicamente datos públicos, sin contacto ni controles de propietario. Las imágenes ausentes usan SVG locales por categoría; el mapa ilustrativo pertenece a la demo.

Publicar envía reportes sin fotos a la API y los conserva en PostgreSQL; exige una sesión y mantiene privado el número de WhatsApp. La carga de fotos corresponde a S1-06. Resumen, Mis reportes y Guardados conservan sus flujos de demostración, y los guardados solo viven en memoria. Los reportes/telefonía demo y el seed son ficticios; el seed incluye un autor «Santiago Demo» para comprobar que su nombre no concede permisos. Las fotos de demostración usan Unsplash.

## Seguimiento TDD

```bash
pnpm test
git add <archivos-del-cambio>
git commit -m "feat(catalog): describir el comportamiento"
```

Ejecutar `pnpm test` en rojo y en verde durante cada ciclo. Los scripts originales guardan las ejecuciones en `script/tdd_log.json` y las métricas de commits en `script/commit-history.json`; ambos JSON se versionan. El hook añade los registros y hace un `amend` automático del commit recién creado: esperar a que termine antes de hacer push. El SHA final se obtiene con `git rev-parse HEAD`; la última entrada del registro usa el marcador `HEAD` previsto por TDDLab.

`pnpm test:unit` y `pnpm verify` verifican resultados sin añadir evidencia de desarrollo. Las pruebas focalizadas o de integración no sustituyen la ejecución registrada de `pnpm test`. No editar los JSON a mano ni reconstruir ciclos anteriores a la migración. La [guía de pruebas](docs/testing.md) detalla límites y comandos.

## Validación

```bash
pnpm verify
pnpm test:integration
pnpm test:e2e
```

La [guía de TDD y pruebas](docs/testing.md) explica selección de interfaces, ciclos red/green y comandos focalizados. `test:e2e` ya incluye integración/build: no hace falta ejecutar ambos íntegros en cada entrega. `pnpm test:auth` comprueba registro, confirmación, sesión y `GET /me` contra Supabase Auth real en un proyecto Compose desechable. `pnpm format` aplica el estilo; `pnpm format:check` lo verifica. Jest 29.7 es el ejecutor compartido con la instrumentación original de TDDLab.

Las dos últimas órdenes crean y eliminan un PostgreSQL aislado con credenciales efímeras, sin requerir `.env` ni modificar la base de desarrollo. `test:e2e` también inicia API/web en puertos libres y usa Chromium para comprobar carga, búsqueda sin tildes, filtros combinados, limpieza, límite, privacidad, error/reintento, vacío, reinicio y recorridos de móvil/escritorio. Usa Chromium del sistema (`/usr/bin/chromium`) o define `CHROMIUM_PATH`; si no tienes uno, instala el navegador local de Playwright con `pnpm exec playwright install chromium`. Las capturas quedan en `test-results/`, ignorado por Git.

Consulta [la API](apps/api/README.md), [la evidencia de S1-01](docs/validation/s1-01.md) y [la de S1-02](docs/validation/s1-02.md).

## Instrucciones del repositorio

[AGENTS.md](AGENTS.md) activa cuatro [skills locales y mantenibles](docs/agent-workflow.md). Están versionadas en `.agents/skills/` y remiten a guías canónicas; cualquier cambio que invalide sus instrucciones debe actualizarlas en la misma PR. CI valida estructura y enlaces; el equipo revisa significado y resultados.

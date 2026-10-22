# Demo en tars-vps y Vercel

Backend manual y desechable en `/opt/stacks/perdi-u`, independiente de Pulso y del resto de stacks. El frontend se despliega con Vercel. No hay CD, registro de imágenes ni servicios nuevos de pago.

```text
Navegador → https://perdi-u-chi.vercel.app
                /api/* y /auth/* (rewrites de Vercel)
                         ↓ HTTPS
                perdi-u-api.alecastro.dev (NPM)
                         ↓ HTTP, proxy-net
                perdi-u-gateway:8080
                     ├─ /api/* → API :3000
                     └─ /auth/* → GoTrue :9999
                                  ↓
                         PostgreSQL privado
```

El gateway elimina los prefijos igual que Vite. El navegador conserva el mismo origen, sin habilitar CORS en la API. No se cachean respuestas de API/Auth y el access log del gateway omite query strings de confirmación. La configuración sigue las [rewrites externas de Vercel](https://vercel.com/docs/routing/rewrites).

## Archivos y límites

Los archivos versionables están en [`deploy/vps`](../deploy/vps/compose.yaml). En el VPS se copian junto a un clon limpio de `main`:

```text
/opt/stacks/perdi-u/
  compose.yaml
  Dockerfile
  Dockerfile.dockerignore
  nginx.conf
  database-init.sql
  .env                       # nuevo, modo 600; nunca en Git
  repo/                      # clon de Alee053/perdi-u, rama main
```

El `.env` sigue el [ejemplo](../deploy/vps/.env.example), con contraseñas hexadecimales independientes y claves ES256 nuevas. En el VPS se añaden `PERDIU_SOURCE_DIR=./repo` y `PERDIU_DOCKERFILE=../Dockerfile`. No copiar el `.env` de desarrollo ni claves privadas al frontend. Para generar las claves con el comando existente, redirigir `pnpm auth:keys` a un archivo privado, sin mostrar su salida; nunca regenerarlas en una actualización normal.

El build usa Node 24.22.0, pnpm 10.29.2 y el lockfile. [`Dockerfile.dockerignore`](../deploy/vps/Dockerfile.dockerignore) permite únicamente entradas de compilación; ni `.env`, ni Git, ni datos locales entran al contexto. El runtime de API ejecuta JS compilado como usuario sin privilegios y contiene solo dependencias de producción.

PostgreSQL y GoTrue no publican puertos. La API y Auth solo pertenecen a la red propia; únicamente el gateway se conecta también a `proxy-net`. El usuario de API `perdiu_app` tiene permisos de datos, sin administración ni cambios de esquema; Auth tiene su rol/base separados. El volumen `perdi-u_postgres-data` conserva ambas bases al recrear contenedores. Los servicios tienen reinicio automático, healthchecks, límites de memoria y rotación de logs.

Esta instalación es una **demo aislada**, no un destino de producción para el CLI. La base `perdiu_demo_dev` vive solo en su contenedor. `migrate` comparte su namespace de red y usa `127.0.0.1` con `NODE_ENV=development`; así se conservan las restricciones existentes de mantenimiento. La API sí ejecuta `NODE_ENV=production` y nunca recibe la contraseña administrativa. No reutilizar este procedimiento para migrar bases compartidas. El seed es ficticio y se aplica expresamente una sola vez.

## Nginx Proxy Manager

Crear un Proxy Host:

| Campo                 | Valor                                    |
| --------------------- | ---------------------------------------- |
| Domain Names          | `perdi-u-api.alecastro.dev`              |
| Scheme                | `http`                                   |
| Forward Hostname / IP | `perdi-u-gateway`                        |
| Forward Port          | `8080`                                   |
| SSL                   | Certificado para ese dominio y Force SSL |

Apuntar el DNS al VPS. NPM ya pertenece a `proxy-net`; no hacen falta puertos nuevos, Custom Locations ni cambios en otros Proxy Hosts. No activar caché. No publicar Mailpit ni la base. NPM termina TLS; el enlace interno al gateway usa la red Docker existente.

## Vercel

Usar la **raíz del monorepo** como Root Directory, Node 24 y pnpm del `packageManager`. [`vercel.json`](../vercel.json) define Vite, build web con Turbo, salida `apps/web/dist`, rewrites externas y fallback de la SPA. Esa configuración debe estar integrada en `main` antes del deploy automático del frontend; prepararla localmente no cambia un proyecto Vercel existente.

En Vercel, `ENABLE_EXPERIMENTAL_COREPACK=1` permite usar el pnpm fijado en `packageManager`; mantener Install Command automático.

Mantener `VITE_API_BASE_URL=/api` y `VITE_AUTH_URL=/auth` (son los valores por defecto). `API_PROXY_TARGET`/`AUTH_PROXY_TARGET` solo sirven a Vite local; no configuran el proxy en Vercel. No definir secretos de BD/Auth en Vercel. Comprobar que `perdi-u-chi.vercel.app` pertenece al proyecto nuevo y que las rewrites están publicadas.

Auth usa `AUTH_SITE_URL=https://perdi-u-chi.vercel.app`, issuer `https://perdi-u-chi.vercel.app/auth` y solo permite redirigir a ese sitio. Si cambia el dominio definitivo, cambiar `AUTH_SITE_URL` en el VPS, recrear Auth y API y actualizar la documentación. Ambos deben usar el mismo issuer; las sesiones que conserven el anterior deben volver a iniciar sesión. Los previews con otra URL no se habilitan automáticamente para autenticación.

## Fotos en R2

Para habilitar fotos, completar juntas `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` en `/opt/stacks/perdi-u/.env`, conservando modo `600`. El Compose pasa esas variables únicamente a la API. Sin las cuatro, las fotos siguen deshabilitadas; una configuración parcial impide iniciar la API. Los reportes sin fotos no requieren R2.

Usar un bucket privado con endpoint estándar `https://<account-id>.r2.cloudflarestorage.com` y credenciales S3 de lectura/escritura de objetos limitadas a ese bucket. El adapter actual no admite endpoints de jurisdicciones especiales. No añadir secretos a Vercel ni usar prefijos `VITE_`. Como el navegador accede mediante la API, no se requiere acceso público ni CORS en el bucket.

El gateway admite `6m` por petición para una foto de hasta 5 MiB más multipart. Comprobar que NPM permita al menos ese tamaño. El esquema debe incluir `004_report_media.sql`; la actualización completa ejecuta las migraciones y renueva los permisos del rol de aplicación antes de arrancar la API. Un healthcheck de catálogo no demuestra que las credenciales de R2 permitan subir, leer y borrar: comprobar ese recorrido con un objeto de prueba y retirarlo al terminar, sin mostrar claves ni URLs privadas.

## Arranque y actualización manual

Los archivos de despliegue pueden copiarse al VPS antes de integrarlos a `main`; el clon `repo/` conserva exclusivamente el código publicado. Una vez integrados, para actualizar también la configuración copiar los cinco archivos de `repo/deploy/vps/` sobre los equivalentes del stack, sin sobrescribir `.env`.

```bash
ssh tars-vps
cd /opt/stacks/perdi-u
git -C repo status --short         # debe estar limpio
git -C repo pull --ff-only origin main
docker compose build api
docker compose up -d --wait --wait-timeout 180 --force-recreate
docker compose ps -a
```

Compose recrea los contenedores conservando el volumen, espera PostgreSQL, ejecuta las migraciones idempotentes y el bootstrap de roles, espera Auth/API y finalmente inicia el gateway. La recreación también carga cambios de configuración montada, como `nginx.conf`. Si un paso falla, diagnosticar ese servicio antes de continuar. No hacer `reset --hard`, borrar volúmenes ni usar `docker system prune` para resolver fallos. El código ejecutado es el SHA de `git -C repo rev-parse HEAD`.

Cuando se autorice actualizar el backend antes del merge para evitar que el frontend nuevo llegue primero, usar un SHA exacto de la rama ya verificada: comprobar árbol limpio, hacer fetch y `git -C repo switch --detach <sha>`, copiar sus archivos de `deploy/vps`, construir y ejecutar el mismo procedimiento. Registrar ese SHA y respaldar previamente configuración, base e imagen anterior. Tras el merge autorizado por las reglas del repositorio, volver a `main` y actualizar con `--ff-only`; contrastar que el código desplegado coincide. El despliegue del backend sigue siendo manual: el merge por sí solo no lo actualiza.

Solo para preparar los datos ficticios iniciales, con el stack ya levantado:

```bash
docker compose run --rm --no-deps migrate \
  node node_modules/@perdiu/database/dist/cli.js seed
```

Para inspección y diagnóstico:

```bash
docker compose ps -a
docker compose logs --tail 80 api gateway
docker compose logs --tail 80 migrate database-init
```

Los logs de Auth pueden contener correos y rutas de confirmación; inspeccionarlos en privado y no compartirlos sin filtrar. No ejecutar `docker compose config` sin `--quiet` en una salida compartida: expande los secretos.

## Registro directo para la demo

En el `.env` privado de este VPS se habilitó `AUTH_MAILER_AUTOCONFIRM=true` por decisión del propietario: el registro entrega sesión inmediatamente y no envía un enlace de confirmación. El correo declarado no demuestra control de la casilla. No se ha configurado entrega de correo ni recuperación de contraseña por correo para esta demo.

El Compose conserva `false` como valor por defecto; el [ejemplo de entorno de la demo](../deploy/vps/.env.example) activa la excepción expresamente. No cambiar el Compose raíz de desarrollo. El frontend ya admite una sesión inmediata al registrarse, así que este ajuste solo requiere recrear Auth/API:

```bash
cd /opt/stacks/perdi-u
docker compose up -d --no-deps --force-recreate --wait --wait-timeout 120 auth api
```

Las cuentas que quedaron pendientes antes del cambio siguen pendientes al intentar iniciar sesión. Volver a «Crear cuenta» con el mismo correo y la contraseña original completa su registro bajo la nueva configuración; no se borran cuentas ni se cambian contraseñas.

Mailpit sigue privado para diagnóstico. Para inspeccionarlo, abrir un túnel desde el portátil:

```bash
ssh -N -L 18025:127.0.0.1:18025 tars-vps
```

Abrir <http://127.0.0.1:18025>. No hace falta acceder a Mailpit para registrarse en el modo actual. Para volver a exigir confirmación, poner `AUTH_MAILER_AUTOCONFIRM=false`, configurar un SMTP autorizado con su remitente y recrear Auth/API. Con confirmación habilitada, el enlace debe abrirse en el mismo navegador para completar PKCE; Mailpit solo captura correos y no los entrega.

## Verificar después de NPM y Vercel

```bash
curl --fail https://perdi-u-api.alecastro.dev/api/reports
curl --fail https://perdi-u-api.alecastro.dev/auth/health
curl --fail https://perdi-u-chi.vercel.app/api/reports
curl -i https://perdi-u-chi.vercel.app/api/me
```

Esperar catálogo `200` con array JSON, Auth `200` y `/me` sin token `401`. Confirmar que el dominio de Vercel devuelve JSON en `/api/reports`, no el HTML de la SPA. El catálogo sembrado no debe exponer contactos privados ni claves de almacenamiento. Un stack saludable en Docker no demuestra todavía que DNS, certificado o rewrites estén correctos; probar ambos dominios y una sesión real.

La [verificación inicial](validation/deployment.md) incluye HTTPS y Auth públicos aprobados después de configurar NPM. También registra el 1010 que Cloudflare entrega a `Python-urllib`; para repetir las comprobaciones anteriores, curl funciona con la configuración actual.

La implementación de `main` solo persiste los recorridos que tenga integrados. Este despliegue no añade publicación ni gestión de reportes que sigan siendo demo en el frontend; consultar el [README](../README.md).

## Parar, respaldar y retirar

Parar temporalmente sin borrar datos: `docker compose stop`. Desmontar conservando el volumen: `docker compose down`. Para actualizar, no hace falta desmontar primero.

Antes de retirar datos que se quieran conservar, crear un respaldo privado del cluster (incluye usuarios y Auth):

```bash
cd /opt/stacks/perdi-u
umask 077
docker compose exec -T postgres pg_dumpall -U perdiu > backup.sql
```

Cuando el propietario autorice el borrado definitivo al terminar el proyecto:

```bash
cd /opt/stacks/perdi-u
docker compose down --volumes
docker image rm perdi-u-api:demo
```

Esto borra **ambas bases y sus cuentas**. La red externa `proxy-net` permanece. Después se puede retirar únicamente `/opt/stacks/perdi-u`, su Proxy Host y DNS, y desconectar/eliminar el proyecto Vercel según corresponda. No eliminar redes, imágenes o volúmenes de otros stacks. Los backups son sensibles y se conservan o eliminan de forma explícita.

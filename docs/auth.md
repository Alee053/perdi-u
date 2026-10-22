# Autenticación con Supabase Auth (GoTrue) self-hosted

PerdiU usa [Supabase Auth](https://supabase.com/docs/guides/auth) (GoTrue) como único dueño de las contraseñas y sesiones. Corre en el [Compose raíz](../compose.yaml) sobre el mismo PostgreSQL, sin Supabase Cloud, Kong ni otros servicios de Supabase. La API verifica los tokens con las claves públicas de Auth; la web usa el SDK oficial [`@supabase/auth-js`](https://supabase.com/docs/reference/javascript/auth-api).

## Cómo funciona

```text
Navegador ──/auth──▶ Vite proxy ──▶ GoTrue :9999 ──▶ PostgreSQL perdiu_auth.auth
    │                                   │ firma ES256 (clave privada)
    └──/api + Bearer──▶ API NestJS ─────┘ verifica con /.well-known/jwks.json
```

1. Registro por defecto: correo, contraseña (8–72 caracteres) y confirmación. GoTrue guarda el usuario en `perdiu_auth.auth.users` con hash bcrypt y envía el enlace de confirmación. En desarrollo, Mailpit lo captura y nunca sale de tu equipo. La demo aislada tiene una excepción explícita de autoconfirmación descrita más abajo.
2. El enlace pasa por `/auth/verify`, confirma el correo y vuelve al sitio con un código PKCE de un solo uso. El SDK lo canjea por una sesión en ese navegador. Si se abre en otro, el correo queda confirmado y se pide iniciar sesión. El código se elimina de la URL.
3. Inicio de sesión: GoTrue devuelve un access token ES256 de 15 minutos y un refresh token rotativo. El SDK los persiste en `localStorage` (`perdiu-auth`) y renueva el access token automáticamente.
4. La web solo considera autenticada la sesión cuando `GET /api/me` la acepta. Un 401 elimina la sesión local y pide ingresar nuevamente.
5. `AuthGuard` exige `Authorization: Bearer`. Verifica firma ES256 con el JWKS, `iss`, `aud=authenticated`, `exp`, `role=authenticated`, `sub` y `session_id` UUID, y rechaza usuarios anónimos. Otros algoritmos (HS256, `none`) se rechazan. Después consulta en PostgreSQL si ese `session_id` fue revocado. Responde 401 sin detalles, o 503 si no puede obtener las claves o consultar las revocaciones.
6. Cerrar sesión revoca la sesión actual en tres pasos: `POST /api/me/logout` registra el `session_id` verificado en `session_revocations`; luego se revoca en GoTrue y por último se borra la sesión local. Si la API falla, Auth no se cierra y se informa el error. Si falla GoTrue después de la API, la API ya rechaza el token y un reintento continúa con un 401 de la API. Los refresh tokens revocados dejan de funcionar y GoTrue conserva el `session_id` al renovar, así que la API también rechaza los tokens renovados de esa sesión. La revocación sobrevive a reinicios de la API.
7. «Mi perfil» muestra nombre, foto o avatar genérico y correo propio a partir de `GET /api/me` (`Cache-Control: no-store`). Al cerrar sesión se vuelve al catálogo y se descartan identidad, guardados, detalle y borradores; si el navegador restaura la página desde su caché atrás/adelante, la web la recarga para verificar la sesión nuevamente.

La identidad es siempre el `sub` verificado: un nombre visible o un ID enviado por el cliente nunca concede propiedad. `Publicar reporte`, `Mis reportes` y `Mi perfil` requieren sesión en la web; el catálogo, el mapa, los guardados del dispositivo y la seguridad siguen siendo públicos.

`GET /me/reports` y `PATCH /reports/:id/resolve` usan el mismo guard con revocación por sesión. El historial privado sigue la identidad de `GET /me`; al cambiar de cuenta se borran sus datos y se descartan respuestas tardías. Un `401` de estas rutas vuelve a pedir ingreso. Los permisos y respuestas se describen en [la API](../apps/api/README.md#historial-propio-y-cierre).

## Datos y permisos en PostgreSQL

[`bootstrap.sql`](../packages/database/auth/bootstrap.sql) lo ejecuta el servicio de un solo uso `auth-db-init` en cada `pnpm db:up`. Es idempotente y no lee ni modifica `perdiu_dev`; funciona también sobre un volumen existente sin recrearlo.

| Objeto        | Configuración                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `perdiu_auth` | Rol con `LOGIN` y sin superusuario, `CREATEDB`, `CREATEROLE` ni replicación. Sin privilegios en las tablas de PerdiU.        |
| `perdiu_auth` | Base propiedad de ese rol; `PUBLIC` no puede conectarse. GoTrue aplica sus migraciones en el esquema `auth` al iniciar.      |
| `postgres`    | Rol `NOLOGIN` sin privilegios: una migración oficial de GoTrue le concede `SELECT` y falla si no existe. Nadie puede usarlo. |

Los datos de PerdiU siguen en `perdiu_dev` (y `profiles.id` usará el sujeto de Auth); no hay claves foráneas entre bases. GoTrue gestiona su esquema: no editarlo con migraciones de PerdiU.

## Configuración

`pnpm auth:keys` imprime tres secretos nuevos; cópialos al `.env` raíz ignorado. Las variables están en [`.env.example`](../.env.example) y [su versión web](../apps/web/.env.example).

| Variable                             | Consumidor                     | Uso                                                                                      |
| ------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------- |
| `AUTH_DB_PASSWORD`                   | Compose (`auth-db-init`, Auth) | Contraseña del rol `perdiu_auth`. Secreta.                                               |
| `AUTH_JWT_KEYS`                      | Auth                           | JWK EC P-256 privada que firma los tokens. Secreta; nunca en la API, la web ni `VITE_*`. |
| `AUTH_JWT_SECRET`                    | Auth                           | Obligatoria para GoTrue; no firma tokens si hay claves asimétricas. Secreta.             |
| `AUTH_SITE_URL`, `AUTH_PUBLIC_URL`   | Auth                           | Origen de la web y URL pública de Auth (`<sitio>/auth`); el issuer es `AUTH_PUBLIC_URL`. |
| `AUTH_REDIRECT_ALLOW_LIST`           | Auth (opcional)                | Redirecciones permitidas; por defecto `localhost` y `127.0.0.1` en el puerto 5173.       |
| `AUTH_MAILER_AUTOCONFIRM`            | Auth                           | `false` exige confirmar el correo (por defecto).                                         |
| `AUTH_SMTP_*`                        | Auth (opcional)                | SMTP real; por defecto Mailpit local.                                                    |
| `AUTH_JWKS_URL`, `AUTH_JWT_ISSUER`   | API                            | URL del JWKS público y emisor esperado. La API falla al iniciar si faltan.               |
| `AUTH_JWT_AUDIENCE`                  | API (opcional)                 | `authenticated` por defecto.                                                             |
| `VITE_AUTH_URL`, `AUTH_PROXY_TARGET` | Web / Vite                     | `/auth` (pública) y destino del proxy `http://127.0.0.1:9999`.                           |

Si cambias el puerto o el dominio de la web, actualiza juntas `AUTH_SITE_URL`, `AUTH_PUBLIC_URL`, `AUTH_JWT_ISSUER` y la lista de redirecciones, y recrea Auth con `pnpm db:up`.

## Ejecutar y probar a mano

```bash
pnpm auth:keys        # copiar las tres líneas al .env
pnpm db:up            # PostgreSQL, bootstrap, Auth (127.0.0.1:9999) y Mailpit (127.0.0.1:8025)
pnpm db:migrate && pnpm db:seed
pnpm dev              # web http://localhost:5173, API http://127.0.0.1:3000
```

1. Abre «Mis reportes» o «Iniciar sesión» y crea una cuenta.
2. Abre el correo en <http://127.0.0.1:8025> y pulsa el enlace en el mismo navegador.
3. Recarga la página y comprueba que sigues dentro. Luego cierra sesión desde el encabezado.
4. Intenta ingresar con una contraseña incorrecta.

`GET /api/me` responde 401 sin token.

## Pruebas automatizadas

| Comando                 | Qué demuestra                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm test`             | Verificador de tokens (vencidos, adulterados, HS256/`none`, emisor/audiencia/rol ajenos, sin sesión, sesión revocada), configuración y presenter/cliente web con dobles (orden y fallos del cierre, perfil, cambio de cuenta).                   |
| `pnpm test:integration` | `GET /me` sobre PostgreSQL aislado con un JWKS HTTP local: 200 con identidad y perfil propio, 401 uniforme, 503 si no hay claves; `POST /me/logout` y reutilización del token antes y después de reiniciar la API; catálogo público.             |
| `pnpm test:auth`        | Proveedor real: levanta este `compose.yaml` como proyecto desechable, registra, confirma vía Mailpit, inicia sesión, llama `/me`, renueva, revoca en la API (el mismo token recibe 401) y en Auth. Elimina contenedores y volúmenes al terminar. |

`pnpm test:auth --with-browser` añade el recorrido reproducible en Chromium con dos cuentas confirmadas y el mismo nombre público: entrar, publicar por formulario, buscar, abrir detalle/contacto, confirmar/cancelar/reintentar el cierre, recargar desde perfil y reiniciar la API. También comprueba filtros, vacío, cambio de cuenta y móvil/escritorio. Solo se doblan los 503 deliberados y el destino externo de WhatsApp; no se envían mensajes. `pnpm test:e2e` cubre catálogo/detalle públicos y dobla la sesión del escenario de contacto; la aceptación autenticada usa el proveedor real.

## Producción y límites

La [demo del VPS](deployment.md) usa `https://perdi-u-chi.vercel.app` y habilita expresamente `AUTH_MAILER_AUTOCONFIRM=true`, autorizado por el propietario para registrarse sin SMTP. El usuario recibe sesión al registrarse; la identidad de la cuenta sigue siendo el `sub` firmado, pero el correo ya no demuestra control de la casilla. La configuración por defecto de Compose/desarrollo sigue exigiendo confirmación. Mailpit permanece accesible solo por túnel SSH y no entrega correos reales. La guía distingue esta base aislada de un despliegue de producción y explica cómo volver a exigir confirmación.

- Servir web, `/auth` y `/api` por HTTPS desde el mismo origen mediante un proxy inverso. Así no se necesita CORS. Cambia las URLs públicas a `https://` y usa un SMTP real con SPF/DKIM.
- No publicar los puertos 9999/8025 ni PostgreSQL. Gestionar `AUTH_JWT_KEYS` en un gestor de secretos y rotarla añadiendo la clave nueva antes de retirar la anterior.
- La API rechaza de inmediato los tokens de una sesión cerrada desde PerdiU. Un cierre hecho fuera de la web (otra herramienta llamando solo a GoTrue) no pasa por la API: ese access token sigue siendo válido hasta su `exp` (15 minutos). El cierre en todos los dispositivos no está implementado.
- `session_revocations` no se depura todavía: crece con cada cierre de sesión. Una limpieza periódica podrá borrar filas cuya sesión de GoTrue ya venció.
- El SDK guarda el refresh token en `localStorage`: un XSS podría robarlo. Mantener CSP y evitar HTML no confiable. Las cookies `httpOnly` requerirían un backend de sesión que hoy no existe.
- Este cambio implementa correo y contraseña. Google OAuth ([S1-03](https://github.com/Alee053/perdi-u/issues/3)), la recuperación de contraseña y la sincronización del perfil local (nombre/foto) quedan pendientes.

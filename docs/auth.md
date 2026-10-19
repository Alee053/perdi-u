# Autenticación con Supabase Auth (GoTrue) self-hosted

PerdiU usa [Supabase Auth](https://supabase.com/docs/guides/auth) (GoTrue) como único dueño de las contraseñas y sesiones. Corre en el [Compose raíz](../compose.yaml) sobre el mismo PostgreSQL, sin Supabase Cloud, Kong ni otros servicios de Supabase. La API verifica los tokens con las claves públicas de Auth; la web usa el SDK oficial [`@supabase/auth-js`](https://supabase.com/docs/reference/javascript/auth-api).

## Cómo funciona

```text
Navegador ──/auth──▶ Vite proxy ──▶ GoTrue :9999 ──▶ PostgreSQL perdiu_auth.auth
    │                                   │ firma ES256 (clave privada)
    └──/api + Bearer──▶ API NestJS ─────┘ verifica con /.well-known/jwks.json
```

1. Registro: correo, contraseña (8–72 caracteres) y confirmación. GoTrue guarda el usuario en `perdiu_auth.auth.users` con hash bcrypt y envía el enlace de confirmación. En desarrollo, Mailpit lo captura y nunca sale de tu equipo.
2. El enlace pasa por `/auth/verify`, confirma el correo y vuelve al sitio con un código PKCE de un solo uso. El SDK lo canjea por una sesión en ese navegador. Si se abre en otro, el correo queda confirmado y se pide iniciar sesión. El código se elimina de la URL.
3. Inicio de sesión: GoTrue devuelve un access token ES256 de 15 minutos y un refresh token rotativo. El SDK los persiste en `localStorage` (`perdiu-auth`) y renueva el access token automáticamente.
4. La web solo considera autenticada la sesión cuando `GET /api/me` la acepta. Un 401 elimina la sesión local y pide ingresar nuevamente.
5. `AuthGuard` exige `Authorization: Bearer`. Verifica firma ES256 con el JWKS, `iss`, `aud=authenticated`, `exp`, `role=authenticated`, `sub` y `session_id` UUID, y rechaza usuarios anónimos. Otros algoritmos (HS256, `none`) se rechazan. Responde 401 sin detalles o 503 si no puede obtener las claves.
6. Cerrar sesión revoca primero la sesión actual en GoTrue y después borra la local. Si la revocación falla, la sesión sigue y se informa el error. Los refresh tokens revocados dejan de funcionar.

La identidad es siempre el `sub` verificado: un nombre visible o un ID enviado por el cliente nunca concede propiedad. `Publicar reporte` y `Mis reportes` requieren sesión en la web; el catálogo, el mapa, los guardados del dispositivo y la seguridad siguen siendo públicos.

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

| Comando                 | Qué demuestra                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`             | Verificador de tokens (vencidos, adulterados, HS256/`none`, emisor/audiencia/rol ajenos, sin sesión), configuración y presenter/cliente web con dobles.                                           |
| `pnpm test:integration` | `GET /me` sobre PostgreSQL aislado con un JWKS HTTP local: 200 con identidad, 401 uniforme, 503 si no hay claves; catálogo público.                                                               |
| `pnpm test:auth`        | Proveedor real: levanta este `compose.yaml` como proyecto desechable, registra, confirma vía Mailpit, inicia sesión, llama `/me`, renueva y revoca. Elimina contenedores y volúmenes al terminar. |

La interfaz (formularios, redirecciones, recarga y cierre de sesión en móvil/escritorio) se comprobó manualmente con Playwright contra este stack. `pnpm test:e2e` solo cubre que una visita anónima a «Publicar» lleva al login.

## Producción y límites

- Servir web, `/auth` y `/api` por HTTPS desde el mismo origen mediante un proxy inverso. Así no se necesita CORS. Cambia las URLs públicas a `https://` y usa un SMTP real con SPF/DKIM.
- No publicar los puertos 9999/8025 ni PostgreSQL. Gestionar `AUTH_JWT_KEYS` en un gestor de secretos y rotarla añadiendo la clave nueva antes de retirar la anterior.
- Un access token sigue siendo válido hasta 15 minutos después del logout. La API comprueba la firma y la expiración, no la existencia de la sesión. La revocación inmediata en la API corresponde a [S1-04](https://github.com/Alee053/perdi-u/issues/4).
- El SDK guarda el refresh token en `localStorage`: un XSS podría robarlo. Mantener CSP y evitar HTML no confiable. Las cookies `httpOnly` requerirían un backend de sesión que hoy no existe.
- Este cambio implementa correo y contraseña. Google OAuth ([S1-03](https://github.com/Alee053/perdi-u/issues/3)), la recuperación de contraseña y la sincronización del perfil local (nombre/foto) quedan pendientes.

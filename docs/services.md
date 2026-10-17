# Servicios, configuración y entornos

El código y las issues vigentes definen lo activo. El [informe histórico](product/README.md) conserva decisiones anteriores y no es una lista de servicios que haya que crear.

| Servicio                     | Estado y dueño                                                                                                                                      | Desarrollo y pruebas                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL 17                | Activo; `packages/database` almacena datos de PerdiU.                                                                                               | [Compose raíz](../compose.yaml), puerto local 5433 y volumen persistente. Aceptación usa otro contenedor efímero con puerto libre.                         |
| API NestJS / web React       | Activos; `apps/api` y `apps/web`.                                                                                                                   | Procesos locales, proxy Vite `/api`; no requieren cuentas externas para el catálogo.                                                                       |
| GitHub / Projects / Actions  | Activos para colaboración, backlog y checks.                                                                                                        | `gh` con acceso al repo y permiso `project` para modificar el tablero. CI usa su token de solo lectura, sin PAT ni claves externas.                        |
| Vercel                       | Integración de preview existente en el repositorio anterior; no configurada por esta migración en `perdi-u`.                                        | Un preview de frontend aprobado no demuestra que exista una API o BD de producción. La configuración de despliegue del equipo se acuerda aparte.           |
| Supabase Auth + Google OAuth | Pendientes en [S1-03](https://github.com/Alee053/PerdiU/issues/3) y [S1-04](https://github.com/Alee053/PerdiU/issues/4). Supabase se limita a Auth. | Presenter/guard con dobles para reglas; aceptación OAuth real con cuenta de prueba autorizada y callbacks documentados. No usar su BD/Storage por defecto. |
| Cloudflare R2                | Pendiente en [S1-06](https://github.com/Alee053/PerdiU/issues/6). Adapter de almacenamiento separado de casos de uso.                               | Dobles para fallos/propiedad; aceptación real en bucket de desarrollo autorizado. No provisionar recursos de pago automáticamente.                         |
| WhatsApp                     | Enlace externo previsto por [S1-07](https://github.com/Alee053/PerdiU/issues/7); la demo ya usa `wa.me`.                                            | Verificar construcción/apertura del enlace sin enviar mensajes. No hay API de mensajería, chat ni cuenta de WhatsApp Business requerida.                   |
| Unsplash / Google Fonts      | Recursos visuales de la demo.                                                                                                                       | No forman parte de la persistencia ni son prerrequisitos de aceptación del catálogo, que usa SVG locales como respaldo.                                    |

## Variables actuales

| Variable                                     | Consumidor y visibilidad                           | Ejemplo sin secretos                                                          |
| -------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                          | Compose local; secreta.                            | Definir una contraseña local propia en `.env`.                                |
| `DATABASE_URL`                               | API y mantenimiento de BD; secreta.                | Formato en [`.env.example`](../.env.example), contraseña codificada para URL. |
| `PORT`, `HOST`                               | API; configuración de proceso.                     | `3000`, `127.0.0.1`.                                                          |
| `VITE_API_BASE_URL`                          | Bundle web; pública.                               | `/api`.                                                                       |
| `API_PROXY_TARGET`                           | Proceso Vite; no se incorpora al bundle.           | `http://127.0.0.1:3000`.                                                      |
| `CHROMIUM_PATH`                              | Runner de aceptación; opcional.                    | Ruta del navegador instalado; CI usa el Chromium de Playwright.               |
| `TEST_DATABASE_URL`, `PERDIU_TEST_CONTAINER` | Internas del runner; no configurarlas manualmente. | Se generan para cada contenedor aislado.                                      |

La API/CLI leen `.env` raíz. Vite lee `apps/web/.env`; copiar su [ejemplo](../apps/web/.env.example) solo si hace falta cambiar los valores por defecto. Un prefijo `VITE_` hace pública la variable: nunca usarlo para credenciales de BD, claves administrativas o secretos del proveedor.

Los nombres/env de Auth y R2, URLs de callback, accesos y responsables concretos se documentarán en sus PRs al implementarse; no inventar variables que el código todavía no consume ni copiar secretos a Git. Si falta acceso real para aceptación, registrar el bloqueo en la issue y mantener la PR Draft. Una simulación no demuestra que el proveedor esté integrado.

No hay un entorno compartido de backend/BD definido por este repositorio. Desplegarlo, contratar servicios, cambiar permisos o importar datos requiere una decisión y autorización específicas. Las pruebas actuales son locales/aisladas y los datos son ficticios.

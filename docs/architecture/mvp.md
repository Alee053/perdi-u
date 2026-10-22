# Arquitectura MVP de la aplicación web

Este documento describe la arquitectura que realmente implementa `apps/web`. Las responsabilidades del monorepo (API, catálogo, base de datos) siguen en [la guía de arquitectura](../architecture.md); las reglas operativas para agentes están en la skill [`mvp-react`](../../.agents/skills/mvp-react/SKILL.md).

## 1. Qué es MVP

**Model–View–Presenter** separa una interfaz en tres responsabilidades:

- **Model**: el problema del dominio. Entidades, reglas, validaciones y cálculos, más los contratos para obtener datos. No sabe que existe una pantalla.
- **View**: lo que se ve. Muestra datos ya preparados y entrega los eventos del usuario. En nuestra variante es una _Passive View_ ([Fowler](https://martinfowler.com/eaaDev/PassiveScreen.html)): no decide nada importante.
- **Presenter**: intermediario. Recibe los eventos de la View, ejecuta operaciones del Model, administra el estado de presentación (carga, error, éxito, vacío) y transforma los resultados en datos listos para mostrar.

## 2. Por qué MVP en PerdiU

La primera versión concentraba en `App.tsx` 17 estados, reglas de negocio, navegación y efectos del navegador, y las páginas calculaban conteos o manejaban formularios. MVP permite:

- **probar** las reglas y los flujos sin navegador: el Model y el Presenter son TypeScript puro;
- **explicar** cada cambio por su capa: una regla nueva va al Model, un mensaje al Presenter y un estilo a la View;
- **cambiar** la tecnología de la interfaz o de los servicios sin reescribir las reglas.

La aplicación es una SPA de **React 19 + Vite**, no Next.js. Las guías de Next.js sobre Server/Client Components no aplican: no hay renderizado en servidor ni Server Actions, y el backend es la API NestJS de `apps/api`. React sigue siendo la tecnología de la View; Vite solo compila y sirve los archivos.

## 3. Diagrama de capas

```mermaid
flowchart LR
  subgraph View["View · React (views/)"]
    Pages["pages/*Page.tsx"]
    Components["components/, layouts/"]
  end
  subgraph Presenter["Presenter (presenters/)"]
    Hooks["Adaptadores React<br/>useApp, useAuthForm, useStore"]
    Core["Núcleos TypeScript<br/>*.presenter.ts (Store)"]
  end
  subgraph Model["Model (models/)"]
    Rules["Reglas y entidades<br/>filters, publication, contact, credentials"]
    Ports["Puertos<br/>ReportsRepository, ReportDetailRepository, AuthGateway, AccountClient"]
  end
  subgraph Infra["Infrastructure (infrastructure/)"]
    Http["HTTP: catalog-client, publish-client, account-client"]
    Auth["Supabase Auth"]
    Browser["browser-effects, datos demo"]
  end
  App["app/dependencies.ts<br/>raíz de composición"]

  Pages --> Hooks --> Core --> Rules
  Core --> Ports
  Http -. implementa .-> Ports
  Auth -. implementa .-> Ports
  App --> Core
  App --> Infra
  Browser -. implementa Effects .-> Core
```

Las flechas son dependencias de código: la View conoce al Presenter, el Presenter al Model y nadie conoce a la View. La infraestructura implementa contratos del Model (o la interfaz `Effects` del Presenter) y solo `app/dependencies.ts` la conecta.

## 4. Estructura implementada

```text
apps/web/src/
├── app/                      Entrada y composición
│   ├── main.tsx              Monta React
│   ├── App.tsx               Conecta presenters y AppShell
│   └── dependencies.ts       Crea adapters e inyecta dependencias
├── models/                   Model (sin React ni navegador)
│   ├── auth/credentials.ts   Reglas de correo y contraseña
│   ├── auth/session.ts       Puertos AuthGateway y AccountClient
│   └── reports/              report, filters, stats, publication, contact, reports-repository
├── presenters/               Presenter
│   ├── store.ts              Estado observable compartido
│   ├── useStore.ts           Adaptador React genérico
│   ├── effects.ts            Efectos que el presenter pide (temporizador, dirección, WhatsApp, foto…)
│   ├── app/                  shell (navegación), notice (avisos), useApp
│   ├── auth/                 auth (sesión), auth-form (formulario), useAuthForm
│   ├── catalog/              catalog (consulta), filters (selección)
│   └── reports/              reports (demo), report-detail y report-route (enlace), publish, report-card
├── views/                    View
│   ├── layouts/              AppShell, Sidebar, AppHeader
│   ├── pages/                Una página por sección
│   ├── components/           Tarjetas, filtros, detalle, mapa, estados vacíos
│   └── styles.css
└── infrastructure/           Adapters
    ├── http/                 Clientes de catálogo, publicación y cuenta con validación del DTO
    ├── auth/                 Supabase Auth (PKCE)
    ├── browser/              window, temporizadores, vistas previas de fotos
    └── demo/                 Reportes de demostración en memoria
```

## 5. Responsabilidades por capa

| Capa           | Hace                                                                                         | No hace                                                      |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Model          | Propiedad por `author.id`, validar borrador y credenciales, filtrar, contar, crear reportes. | Mensajes en pantalla, React, `window`, `fetch`.              |
| Presenter      | Estados `loading/ready/error`, mensajes en español, etiquetas y fechas, navegación, avisos.  | JSX, imports de views o infraestructura, APIs del navegador. |
| View           | JSX, estilos, accesibilidad, delegar eventos; estado solo visual (popover, foto rota).       | Reglas, cálculos, importar el Model o contratos de la API.   |
| Infrastructure | HTTP, Supabase, `window.open`, `setTimeout`, `URL.createObjectURL`, datos demo.              | Decidir qué se muestra.                                      |

`pnpm check:boundaries` verifica esta tabla en cada archivo de `apps/web/src` (`scripts/lib/web-layers.mjs`).

## 6. Flujo de una funcionalidad real: buscar en el catálogo

1. **View** — `views/components/ReportFilters.tsx`: la persona escribe «cámara»; el `input` llama `setSearch('cámara')`.
2. **Presenter** — `presenters/catalog/filters.presenter.ts`: guarda la selección y avisa el cambio. `app/dependencies.ts` conectó ese aviso con `CatalogPresenter.load`.
3. **Presenter** — `presenters/catalog/catalog.presenter.ts`: cancela la consulta anterior, publica `loading` y pide al Model la consulta.
4. **Model** — `models/reports/filters.ts`: `toReportQuery` recorta el texto y omite los criterios vacíos. El presenter usa el puerto `ReportsRepository`; su implementación (`infrastructure/http/catalog-client.ts`) llama `GET /api/reports?q=cámara` y valida la respuesta.
5. **Presenter**: si la respuesta sigue vigente, convierte cada reporte en `ReportCard` (`report-card.ts`: «Perdido», «Objeto», fecha `14 oct 2026`, iniciales) y publica `ready`; si falla, publica `error` con el mensaje.
6. **View** — `useApp` re-renderiza mediante `useStore`, y `views/pages/ExplorePage.tsx` muestra la grilla, el estado vacío o el error con «Reintentar».

La View nunca filtra ni formatea; el Model nunca sabe qué texto se mostrará.

## 7. Flujo de publicación persistente

1. **View** — `views/pages/PublishPage.tsx` entrega al Presenter los cambios de campos y el envío; no contiene reglas ni accede a la red.
2. **Presenter** — `presenters/reports/publish.presenter.ts` valida, bloquea envíos concurrentes, conserva el borrador si falla y coordina el aviso y la vuelta al catálogo.
3. **Model** — `models/reports/publication.ts` valida el borrador y define `ReportPublisher`; `infrastructure/http/publish-client.ts` implementa ese puerto con el token de sesión.
4. **API y persistencia** — `POST /reports` toma el propietario del token verificado, `CreateReport` valida de nuevo y el adapter de base guarda reporte y contacto privado en una transacción. La respuesta es una proyección pública.

La publicación inicial no adjunta fotos; S1-06 agregará medios al mismo flujo.

## 8. Papel de React y Vite

- React renderiza la View y aporta el ciclo de vida. Los hooks `use*.ts` del Presenter son el único punto de contacto: `useStore` usa `useSyncExternalStore` para suscribirse al estado del núcleo, y `useApp` arranca y limpia la sesión y el catálogo con `useEffect`.
- Los núcleos (`*.presenter.ts`) no importan React: se prueban instanciando la clase.
- Vite compila, sirve la SPA y hace de proxy de `/api` y `/auth` en desarrollo. Las variables `VITE_*` son públicas; ningún secreto llega al navegador.

## 9. Cómo se prueba cada capa

| Capa           | Pruebas                                                                                                             | Herramienta                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Model          | `apps/web/test/models/` — reglas, límites, datos inválidos.                                                         | Jest                         |
| Presenter      | `apps/web/test/presenters/`, `auth.test.ts`, `catalog.test.ts` — eventos, estados, errores, navegación, con dobles. | Jest                         |
| Infrastructure | Clientes HTTP con `fetch` doblado (`catalog.test.ts`, `publish.test.ts`, `auth.test.ts`).                           | Jest                         |
| View           | Recorridos en Chromium de escritorio y móvil (`scripts/browser-catalog.mjs`).                                       | Playwright (`pnpm test:e2e`) |
| Arquitectura   | Imports permitidos por capa (`scripts/test/web-layers.test.mjs`, `pnpm check:boundaries`).                          | Jest + script                |

Los ciclos rojo-verde de esta migración están en [su evidencia](../validation/mvp-refactor.md).

## 10. Diferencias con la arquitectura anterior

| Antes                                                                         | Ahora                                                                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `App.tsx` (424 líneas) con 17 `useState`, reglas, navegación y `window`.      | `app/App.tsx` (11 líneas); estado en presenters por responsabilidad.                      |
| Filtrado, conteos y creación del reporte dentro de componentes.               | `models/reports/*` con pruebas propias.                                                   |
| Propiedad demo por nombre (`person === 'Santiago Demo'`).                     | Propiedad por identificador (`isOwnedBy`, `demoOwner.id`).                                |
| `AuthPresenter` con validaciones y puertos mezclados.                         | Reglas en `models/auth/credentials.ts`, puertos en `session.ts`, presenter solo presenta. |
| `AuthPage` manejaba envío, errores y reenvío.                                 | `AuthFormPresenter` + `useAuthForm`; la página solo renderiza.                            |
| Formulario de publicación validado por atributos HTML y leído con `FormData`. | Campos controlados por `PublishPresenter`, validación del Model y errores por campo.      |
| Sin comprobación automática de capas.                                         | `check:boundaries` falla si una View importa el Model o un núcleo importa React.          |

La interfaz también se simplificó: se quitaron elementos que no funcionaban (gráfico con datos inventados, tendencias «+12 %», atajo `⌘ K`, campana y selector de ciudad sin acción, botón de centrar mapa), el panel con degradado del ingreso, el desenfoque del encabezado y del modal, las animaciones de entrada y las elevaciones al pasar el cursor. En una segunda pasada se dejó una presentación sobria: tipografía del sistema en lugar de Google Fonts, navegación y botones solo con texto (los íconos quedan donde cumplen una función: guardar, cerrar, menú, mostrar contraseña y carga), estado como texto de color, resumen en listas sin tarjetas ni barras, bordes finos sin sombras y radio de 4 px. Los colores, radios y espacios son variables de `views/styles.css` (de 3.364 a unas 1.000 líneas).

## 11. Archivos para mostrar en la presentación

1. `src/models/reports/publication.ts` y `test/models/reports.test.ts`: reglas puras y su prueba.
2. `src/presenters/reports/publish.presenter.ts` y `test/presenters/reports.test.ts`: el Presenter coordina validación, publicación, navegación y aviso con dobles.
3. `src/views/pages/PublishPage.tsx`: la View solo muestra y delega.
4. `src/app/dependencies.ts`: dónde se conectan las capas.
5. `scripts/lib/web-layers.mjs`: la regla de capas convertida en verificación automática.

# Ejemplos reales de MVP en apps/web

Rutas relativas a `apps/web/src`.

## 1. Buscar en el catálogo (View → Presenter → Model → Presenter → View)

1. `views/components/ReportFilters.tsx`: los controles llaman `setSearch`, `setDateFrom` y `setDateTo`. No calculan nada.
2. `presenters/catalog/filters.presenter.ts` guarda la ciudad escrita, etiquetas como «Objeto» y la invalidez nativa de fechas sin valor serializable. Un campo de ciudad vacío omite ese filtro. El Presenter muestra errores sin perder la edición y permite limpiar los segmentos parciales.
3. `presenters/catalog/search.presenter.ts`: restaura los controles desde el puerto `SearchNavigation` antes de cargar y sigue los cambios de selección. La composición conecta su adapter `infrastructure/browser/search-navigation.ts`; el Model valida los parámetros en `models/reports/search-location.ts`. El arranque descarta montajes abandonados para no duplicar la consulta inicial.
4. `presenters/catalog/catalog.presenter.ts`: traduce la selección con `toReportFilters`, no consulta rangos ni enlaces inválidos, pide al Model `toReportQuery` y llama al puerto `ReportsRepository`; cancela la consulta anterior y publica `loading`.
5. `models/reports/filters.ts` valida el rango y construye la consulta con los criterios presentes. `models/reports/reports-repository.ts` declara el puerto y `infrastructure/http/catalog-client.ts` lo implementa para HTTP.
6. El presenter convierte cada `ReportSummary` en `ReportCard` (`presenters/reports/report-card.ts`: etiquetas, fechas, iniciales) y publica `ready` o `error`.
7. `presenters/app/useApp.ts` se suscribe mediante `useStore`. Explorar muestra las tarjetas y `ReportsPresenter.mapView()` proyecta las filas de Mapa desde el mismo catálogo. `CatalogResults` representa carga, error con «Reintentar», vacío y límite en ambas vistas.

## 2. Formulario de ingreso

- View `views/pages/AuthPage.tsx`: inputs controlados por `state` y `form.setEmail`, `form.submit`.
- Adaptador `presenters/auth/useAuthForm.ts`: una instancia de `AuthFormPresenter` por pantalla.
- Presenter `presenters/auth/auth-form.presenter.ts`: `pending`, errores, «Revisa tu correo», reenvío.
- Presenter de sesión `presenters/auth/auth.presenter.ts`: traduce códigos del Model a mensajes y verifica la identidad con la API.
- Model `models/auth/credentials.ts` (reglas) y `models/auth/session.ts` (puertos `AuthGateway`, `AccountClient`).
- Infrastructure `infrastructure/auth/supabase-gateway.ts` y `infrastructure/http/account-client.ts`.

## 3. Publicar un reporte persistente

- View `views/pages/PublishPage.tsx` usa `CityInput` para la ciudad editable con sugerencias y llama `actions.setField` y `actions.submit()`.
- Presenter `presenters/reports/publish.presenter.ts` valida con `validateDraft`, muestra mensajes por campo y llama al puerto `ReportPublisher`. Tras la respuesta coordina catálogo, actualización del historial, navegación y aviso.
- Model `models/reports/publication.ts`: reglas del borrador y puerto. Infrastructure `infrastructure/http/publish-client.ts` envía el borrador autenticado; la API guarda reporte/contacto en una transacción. El formulario nunca envía la identidad: la API la toma del token.

## 4. Abrir un reporte por su enlace y contactar por WhatsApp

- View `views/components/ReportDetail.tsx` renderiza `ReportLinkView` (carga, no disponible, error con «Reintentar», ficha) y delega `onContact`, `onRetry`, `onClose`.
- Presenter `presenters/reports/report-detail.presenter.ts`: sigue la dirección (`/reportes/<id>`, rutas en `report-route.ts`) y la sesión, descarta respuestas obsoletas, pide ingresar a un visitante y nunca guarda el teléfono en su estado. La dirección, «Atrás» y la apertura del chat son `Effects`.
- Model `models/reports/contact.ts` construye el enlace `wa.me` solo para un número válido; `models/reports/reports-repository.ts` declara el puerto `ReportDetailRepository`.
- Infrastructure `infrastructure/http/catalog-client.ts` (`createReportDetailClient`) valida el DTO y traduce 400/404 a «no disponible» y 401 a `SessionRejected`; `infrastructure/browser/browser-effects.ts` usa `history` y `window.open`.

## 5. Consultar el historial y marcar como resuelto

1. Model: `selectOwnReports` exige `author.id` de la sesión y filtra estado; `OwnReportsRepository` declara lectura y cierre sin aceptar un propietario del cliente.
2. Presenter: `OwnReportsPresenter` sigue Auth, carga el historial y prepara filtros, conteos y confirmación. `requestResolve` no escribe; cancelar tampoco. `confirmResolve` conserva el estado si falla, bloquea duplicados y descarta respuestas de cuentas anteriores.
3. Infrastructure: `own-reports-client.ts` consulta `/me/reports` y envía `PATCH /reports/:id/resolve` con bearer, sin caché. Valida los DTO y distingue `SessionRejected` y `OwnReportsFailure`.
4. Composición: después del `204`, actualiza detalle y guardados, retira el caso del catálogo y refresca la misma búsqueda. `ReportDetailPresenter` ofrece cerrar únicamente al autor cuando su historial está cargado.
5. View: `MyReportsPage` y `ResolveConfirmation` muestran estado y delegan eventos; el diálogo nativo conserva foco/teclado. Las pruebas están en `test/presenters/own-reports.test.ts`; el recorrido con Auth real en `scripts/browser-own-reports.mjs`.

Resolver conserva `type = lost | found`; cambia solo `state`. La identidad se valida también en la API y en la escritura SQL. En S1-08, editar/eliminar y reabrir quedaron fuera de esa historia.

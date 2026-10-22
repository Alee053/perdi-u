# Ejemplos reales de MVP en apps/web

Rutas relativas a `apps/web/src`.

## 1. Buscar en el catálogo (View → Presenter → Model → Presenter → View)

1. `views/components/ReportFilters.tsx`: el `input` llama `actions.setSearch(event.target.value)`. No calcula nada.
2. `presenters/catalog/filters.presenter.ts`: `FiltersPresenter.setSearch` guarda la selección visible (`'Todas las ciudades'`, `'Objeto'`…) y avisa el cambio.
3. `app/dependencies.ts`: ese aviso está conectado a `catalog.load(selection)`.
4. `presenters/catalog/catalog.presenter.ts`: traduce la selección con `toReportFilters`, pide al Model `toReportQuery` y llama al puerto `ReportsRepository`; cancela la consulta anterior y publica `loading`.
5. `models/reports/filters.ts` + `models/reports/reports-repository.ts`: regla de consulta y contrato. La implementación HTTP es `infrastructure/http/catalog-client.ts`.
6. El presenter convierte cada `ReportSummary` en `ReportCard` (`presenters/reports/report-card.ts`: etiquetas, fechas, iniciales) y publica `ready` o `error`.
7. `presenters/app/useApp.ts` re-renderiza mediante `useStore`; `views/pages/ExplorePage.tsx` muestra carga, error con «Reintentar», vacío o la grilla.

## 2. Formulario de ingreso

- View `views/pages/AuthPage.tsx`: inputs controlados por `state` y `form.setEmail`, `form.submit`.
- Adaptador `presenters/auth/useAuthForm.ts`: una instancia de `AuthFormPresenter` por pantalla.
- Presenter `presenters/auth/auth-form.presenter.ts`: `pending`, errores, «Revisa tu correo», reenvío.
- Presenter de sesión `presenters/auth/auth.presenter.ts`: traduce códigos del Model a mensajes y verifica la identidad con la API.
- Model `models/auth/credentials.ts` (reglas) y `models/auth/session.ts` (puertos `AuthGateway`, `AccountClient`).
- Infrastructure `infrastructure/auth/supabase-gateway.ts` y `infrastructure/http/account-client.ts`.

## 3. Publicar un reporte demo

- View `views/pages/PublishPage.tsx` llama `actions.setField`, `actions.choosePhoto(file)` y `actions.submit()`.
- Presenter `presenters/reports/publish.presenter.ts` valida con `validateDraft`, muestra mensajes por campo, pide la vista previa a `Effects`, crea el reporte con `publishDemoReport` y coordina: `reports.add`, `filters.reset`, `onPublished` (navegar) y el aviso.
- Model `models/reports/publication.ts`: reglas del borrador, foto aceptada, creación y permisos de resolver/eliminar.

## 4. Resolver un caso propio

- Model: `models/reports/own-reports.ts` selecciona por `author.id`; `own-reports-repository.ts` define lista y cierre. El tipo `lost | found` se conserva al pasar a estado `resolved`.
- Presenter: `OwnReportsPresenter` administra historial, filtros, confirmación, carga, error y respuestas tardías. `ReportsPresenter` conserva el detalle; `CatalogPresenter` descarta la fila pública tras la confirmación del servidor.
- View: `MyReportsPage` y `ReportDetail` llaman `requestResolve`; `ResolveConfirmation` delega cancelar/confirmar y administra únicamente el foco nativo del diálogo.
- Infrastructure: `own-reports-client.ts` consume `GET /me/reports` y `PATCH /reports/:id/resolve`. `app/dependencies.ts` conecta sesión y actualización de listas.
- Pruebas: `test/presenters/own-reports.test.ts`, `test/own-reports-client.test.ts` y aceptación real documentada en [la guía de pruebas](../../../../docs/testing.md).

Para extender este flujo, agregar primero un ejemplo del comportamiento en su interfaz pública y conservar las garantías de identidad, confirmación y persistencia. Las funciones de `publication.ts` pertenecen a la demo local; el cierre real usa el puerto y el servidor.

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

## Receta: añadir «Marcar como encontrado» a un reporte propio

1. Model: `markFound(reports, id, ownerId)` en `models/reports/publication.ts` usando `isOwnedBy`; prueba en `test/models/reports.test.ts`.
2. Presenter: método `markFound = (id) => …` en `ReportsPresenter` que llama al Model y muestra el aviso; `detail()` expone `canMarkFound`. Prueba en `test/presenters/reports.test.ts`.
3. View: en `views/components/ReportDetail.tsx`, `{detail.canMarkFound && <button onClick={onMarkFound}>…</button>}`; `AppShell` pasa `onMarkFound={() => reports.markFound(detail.card.id)}`.

Incorrecto: comprobar `report.person === …` o cambiar el array dentro del componente.

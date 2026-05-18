# E2E (Playwright)

## Cómo correr

```bash
npm run test:e2e
```

El servidor de desarrollo arranca con variables de `playwright.config.ts` (`VITE_E2E`, `VITE_BACKEND_API_URL`, `VITE_AI_SERVICE_URL` en `http://127.0.0.1:5173`) para que **`page.route` intercepte BFF e IA** sin llamar a Render.

## Arquitectura de mocks

| Helper | Uso |
|--------|-----|
| `helpers/mockFirebaseAuth.ts` | Sesión admin (storageState + Firebase + defaults BFF) |
| `helpers/mirrorAdminDataRoutes.ts` | Lecturas admin: duplica **BFF + Supabase REST** (`/admin/products`, `pedidos`, `usuarios`, etc.) |
| `helpers/mockAdminBff.ts` | Mutaciones BFF (`updateProductAtomic`, pedidos, ventas) |
| `helpers/mockAdminAI.ts` | Servicio IA (`/api/predict/*`, `/api/ire/historial`, cache) |
| `helpers/mockClientAuth.ts` | Cliente: Firebase, `/users/me`, catálogo, checkout, **favoritos BFF** |

Tras RLS/BFF, el panel admin **no** debe mockearse solo con `rest/v1/*`. Usar `mirrorAdminProducts`, `mirrorAdminOrders`, etc., o `mirrorAdminProductListSetup` en specs de productos.

Los favoritos en E2E (`VITE_E2E=true`) usan `localStorage` aislado por `uid` (misma semántica que el BFF en servidor). El contrato HTTP del BFF se valida en `src/__tests__/favorites.test.ts`. Para pruebas que intercepten `/favorites` en Playwright, ver `mockBffFavoritesForUser`.

## Auth admin

`e2e/.auth/admin.json` + `injectFakeAdminAuth(page)` en cada spec admin. No commitear credenciales reales.

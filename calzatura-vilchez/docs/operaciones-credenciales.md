# Control operativo de credenciales — AI Service

Fecha: 2026-04-27  
Responsable: administrador del sistema

---

## Opción recomendada: proxy admin (`aiAdminProxy`) — token fuera del bundle

El frontend puede llamar a la Cloud Function **`aiAdminProxy`** en lugar de Render directamente:

1. El navegador envía solo el **Firebase ID token** (`Authorization: Bearer <idToken>`).
2. La función verifica el usuario y que `usuarios.rol === 'admin'`, y reenvía a Render con **`AI_SERVICE_BEARER_TOKEN`** (secreto de Functions, no visible en el JS público).

**Variable en el build del hosting:** `VITE_AI_ADMIN_PROXY_URL` = URL de la función, por ejemplo:

`https://us-central1-calzaturavilchez-ab17f.cloudfunctions.net/aiAdminProxy`

**Secretos en Firebase (una vez por entorno):**

```bash
firebase functions:secrets:set AI_SERVICE_URL
firebase functions:secrets:set AI_SERVICE_BEARER_TOKEN
```

Valores: misma URL base de Render y el mismo token que ya usa `AI_SERVICE_BEARER_TOKEN` en Render. Después:

```bash
firebase deploy --only functions:aiAdminProxy
```

Si `VITE_AI_ADMIN_PROXY_URL` está definida, **no hace falta** `VITE_AI_SERVICE_BEARER_TOKEN` en el bundle de producción para el panel de predicciones ni para invalidar caché desde Admin datos.

---

## Dependencia crítica: token de autenticación del servicio IA

El servicio de predicción de demanda (`calzatura-vilchez-v3.onrender.com`) usa autenticación por Bearer token. Si **no** usáis el proxy, este token debe mantenerse sincronizado en tres lugares simultáneamente:

| Lugar | Variable | Quién la lee |
|---|---|---|
| Render (backend) | `AI_SERVICE_BEARER_TOKEN` | FastAPI — valida cada petición entrante |
| GitHub Secrets | `VITE_AI_SERVICE_BEARER_TOKEN` | CI/CD — la hornea en el bundle de producción |
| `.env.local` (local) | `VITE_AI_SERVICE_BEARER_TOKEN` | Build local y deploy manual a Firebase |

Si alguno de los tres difiere de los otros, el sistema falla:

- Backend distinto al frontend → respuestas `401 Unauthorized`
- Render sin el token configurado → respuestas `503 Auth not configured`
- Frontend sin token (valor vacío) → peticiones sin header `Authorization` → `401`

---

## Procedimiento de rotación del token

Ejecutar en este orden estricto para evitar ventana de fallo:

### 1. Generar el nuevo token

Usar un generador seguro de al menos 32 caracteres alfanuméricos. Ejemplo de formato:

```
cv_ai_v4_<16 chars aleatorios>
```

No reutilizar tokens anteriores.

### 2. Actualizar el backend (Render)

1. Ir a [dashboard.render.com](https://dashboard.render.com) → servicio `calzatura-vilchez-v3`
2. Menú **Environment**
3. Editar `AI_SERVICE_BEARER_TOKEN` con el nuevo valor
4. Guardar — Render redesplegará automáticamente

Esperar a que el badge diga **Live** antes de continuar.

### 3. Actualizar GitHub Secrets

1. Ir al repositorio en GitHub → **Settings → Secrets and variables → Actions**
2. Editar `VITE_AI_SERVICE_BEARER_TOKEN` con el nuevo valor
3. Guardar

### 4. Actualizar `.env.local`

En la máquina de desarrollo, editar `calzatura-vilchez/.env.local`:

```
VITE_AI_SERVICE_BEARER_TOKEN=<nuevo token>
```

### 5. Reconstruir y redesplegar el frontend

```bash
cd calzatura-vilchez
npm run build
npx firebase-tools deploy --only hosting
```

El build hornea el token en el bundle JS. Sin este paso, el frontend sigue enviando el token anterior.

### 6. Verificar sincronización

Abrir DevTools en la app desplegada → pestaña **Network** → cualquier request a `onrender.com` → confirmar que el header `Authorization: Bearer <nuevo token>` coincide con el valor configurado en Render.

---

## Síntomas de desincronización

| Síntoma en DevTools | Causa probable |
|---|---|
| `401 Unauthorized` en `/api/predict/*` | Token del frontend no coincide con Render |
| `503 Auth not configured` | `AI_SERVICE_BEARER_TOKEN` vacío en Render |
| `net::ERR_CONNECTION_REFUSED` | `VITE_AI_SERVICE_URL` apunta a `localhost` — build sin `.env.local` correcto |
| `500 Internal Server Error` | Error interno del AI service (ver logs en Render → **Logs**) |
| No aparece header `Authorization` en requests | `VITE_AI_SERVICE_BEARER_TOKEN` vacío en el build desplegado |

---

## Regla operativa

> Nunca actualizar el token en un solo lugar. Los tres puntos (Render, GitHub Secrets, `.env.local` + redeploy Firebase) deben actualizarse en la misma operación de rotación.

Registrar cada rotación con fecha y responsable en el historial de cambios del proyecto.

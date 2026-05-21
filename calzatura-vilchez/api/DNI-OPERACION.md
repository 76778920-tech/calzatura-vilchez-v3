# Operación — consulta DNI (`lookup-dni.js`)

## Variables en Vercel (al menos una activa)

| Orden | Variable | Proveedor |
|-------|----------|-----------|
| 1 | `APISPERU_TOKEN` / `APISPERU_DNIRUC_TOKEN` | [APIsPERU](https://www.apisperu.com/servicios/dniruc) (personas naturales) |
| 2 | `CONSULTAS_PERU_TOKEN` | ConsultasPerú |
| 3 | `PERUAPI_TOKEN` / `TOKEN_PERUAPI` | Perú API |
| 4 | `API_INTI_TOKEN` | ApiInti |
| 5 | `APIPERU_DEV_TOKEN` | apiperu.dev |
| 6 | `LATINFO_API_KEY` / `CLAVE_API_LATINFO` | Latinfo (solo entidades; DNI persona → omitido) |

Si el 1 no encuentra el DNI o falla, se prueba el 2, y así sucesivamente (primer éxito gana).

Sin token válido: la API responde error y el registro en la app permite **carga manual** de nombres.

## Rate limit

- Web: **4** solicitudes / IP / **30 min**
- App móvil (`X-Calzatura-Client: calzatura-mobile`): **25** / 30 min
- Sin Upstash: memoria por instancia serverless (best-effort).
- Con Upstash (recomendado en producción): cupo **global** entre réplicas.

Variables opcionales en Vercel:

| Variable | Uso |
|----------|-----|
| `UPSTASH_REDIS_REST_URL` | REST URL del database Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST |

Si faltan, `lookup-dni.js` usa el contador en memoria de la instancia.

## Frontend

La web consulta primero el **BFF** (`VITE_BACKEND_API_URL` + `/lookup-dni`).  
Opcional: `VITE_DNI_LOOKUP_URL` solo si no usas BFF.

Configura los tokens en **Render** (mismo servicio del BFF) o en el proyecto Vercel que expone `api/lookup-dni`.

Si ves `502` con `X-DNI-Last-Status: 401`, el token del proveedor (p. ej. `PERUAPI_TOKEN`) está vencido o mal copiado: renueva el token o activa otro proveedor de la tabla superior.

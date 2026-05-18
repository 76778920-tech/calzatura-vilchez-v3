# Operación — consulta DNI (`lookup-dni.js`)

## Variables en Vercel (al menos una activa)

| Variable | Proveedor |
|----------|-----------|
| `LATINFO_API_KEY` / `CLAVE_API_LATINFO` | Latinfo |
| `CONSULTAS_PERU_TOKEN` | ConsultasPerú |
| `PERUAPI_TOKEN` / `TOKEN_PERUAPI` | Perú API |
| `API_INTI_TOKEN` | ApiInti |
| `APIPERU_DEV_TOKEN` | apiperu.dev |

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

`VITE_DNI_LOOKUP_URL` → URL del deployment Vercel (`/api/lookup-dni`).

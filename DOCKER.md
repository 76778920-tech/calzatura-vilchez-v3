# Docker - Calzatura Vilchez

## Levantar el proyecto en desarrollo

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Servicios:

- Frontend React: http://localhost:5173
- Servicio IA: http://localhost:8000
- Firebase Emulator UI: http://localhost:4000
- **Dashboard ISO 25000** (cumplimiento, stress k6, ZAP): http://localhost:4321
  - Informe stress k6: http://localhost:4321/stress/
  - Informe ZAP DAST: http://localhost:4321/zap/

**Requisito:** Docker Desktop debe estar **en ejecución** antes de `docker compose up`. Si no arranca nada, abre Docker Desktop y espera a que el motor esté listo (icono verde).

> Si el puerto **4321** está ocupado por un `node dashboard-iso25000/server.mjs` en el host, detén ese proceso antes de levantar el stack.

## Detener servicios

```bash
docker compose down
```

## Reconstruir desde cero

```bash
docker compose build --no-cache
docker compose up
```

## Seguridad de la llave Firebase

El archivo `ai-service/serviceAccountKey.json` no se copia dentro de la imagen Docker.
Docker Compose lo monta como solo lectura en:

```txt
/run/secrets/firebase-service-account.json
```

El contenedor usa esta variable:

```txt
FIREBASE_KEY_PATH=/run/secrets/firebase-service-account.json
```

## Produccion del frontend

El Dockerfile del frontend tambien tiene una etapa `production` con Nginx:

```bash
docker build --target production -t calzatura-frontend ./calzatura-vilchez
docker run --rm -p 8080:80 calzatura-frontend
```

Abrir:

```txt
http://localhost:8080
```

# Docker - Calzatura Vilchez

## Levantar el proyecto en desarrollo

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Servicios:

- Frontend React: http://localhost:5173
- Servicio IA: http://localhost:8000

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

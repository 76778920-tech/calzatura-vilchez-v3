# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache bash wget
COPY dashboard-iso25000/docker-entrypoint.sh /usr/local/bin/dashboard-iso-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/dashboard-iso-entrypoint.sh && chmod +x /usr/local/bin/dashboard-iso-entrypoint.sh
ENV ISO_BIND_HOST=0.0.0.0
ENV ISO_PORT=4321
EXPOSE 4321
ENTRYPOINT ["/usr/local/bin/dashboard-iso-entrypoint.sh"]

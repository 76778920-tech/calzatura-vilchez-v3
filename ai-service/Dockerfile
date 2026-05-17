FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt requirements.lock ./
COPY scripts/docker_install_locked_deps.sh scripts/
RUN sh scripts/docker_install_locked_deps.sh

COPY . .

RUN useradd --create-home --shell /bin/sh appuser
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

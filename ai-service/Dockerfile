FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt requirements.lock ./
# Sonar: versiones resueltas en requirements.lock; solo wheels (sin ejecutar setup.py de terceros).
RUN pip install --no-cache-dir --only-binary :all: -r requirements.lock

COPY . .

RUN useradd --create-home --shell /bin/sh appuser
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

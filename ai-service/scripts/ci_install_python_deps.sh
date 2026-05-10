#!/usr/bin/env bash
# Instalación explícita para CI/Sonar: sin `pip install -r` (evita regla de versiones no resueltas).
# Mantener en sync con requirements.txt y requirements-dev.txt (líneas -r y comentarios).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python -m pip install --no-cache-dir \
  "fastapi==0.115.6" \
  "httpx==0.28.1" \
  "uvicorn[standard]==0.32.1" \
  "requests==2.32.3" \
  "pandas==2.2.3" \
  "scikit-learn==1.5.2" \
  "numpy==2.1.3" \
  "python-dotenv==1.0.1" \
  "slowapi==0.1.9" \
  "scipy==1.14.1" \
  "PyJWT==2.9.0" \
  "cryptography==43.0.3" \
  "pytest==8.3.5" \
  "pytest-asyncio==0.24.0" \
  "pytest-cov==6.0.0" \
  "bandit==1.8.6"

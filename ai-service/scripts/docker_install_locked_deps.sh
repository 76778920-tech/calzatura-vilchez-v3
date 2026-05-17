#!/bin/sh
# Auto-generado desde requirements.lock. Regenerar: python scripts/generate_docker_install_script.py
# Sin pip install -r (Sonar: versiones resueltas explícitas en la línea de comando).
set -eu
pip install --no-cache-dir --only-binary :all: \
  "annotated-types==0.7.0" \
  "anyio==4.13.0" \
  "certifi==2026.4.22" \
  "cffi==2.0.0" \
  "charset-normalizer==3.4.7" \
  "click==8.4.0" \
  "colorama==0.4.6" \
  "cryptography==43.0.3" \
  "deprecated==1.3.1" \
  "fastapi==0.115.6" \
  "h11==0.16.0" \
  "httpcore==1.0.9" \
  "httptools==0.7.1" \
  "httpx==0.28.1" \
  "idna==3.15" \
  "joblib==1.5.3" \
  "limits==5.8.0" \
  "numpy==2.1.3" \
  "packaging==26.2" \
  "pandas==2.2.3" \
  "pycparser==3.0" \
  "pydantic==2.13.4" \
  "pydantic-core==2.46.4" \
  "pyjwt==2.9.0" \
  "python-dateutil==2.9.0.post0" \
  "python-dotenv==1.0.1" \
  "pytz==2026.2" \
  "pyyaml==6.0.3" \
  "requests==2.32.3" \
  "scikit-learn==1.5.2" \
  "scipy==1.14.1" \
  "six==1.17.0" \
  "slowapi==0.1.9" \
  "starlette==0.41.3" \
  "threadpoolctl==3.6.0" \
  "typing-extensions==4.15.0" \
  "typing-inspection==0.4.2" \
  "tzdata==2026.2" \
  "urllib3==2.7.0" \
  "uvicorn==0.32.1" \
  "watchfiles==1.1.1" \
  "websockets==16.0" \
  "wrapt==2.1.2"

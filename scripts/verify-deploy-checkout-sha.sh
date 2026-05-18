#!/usr/bin/env bash
# Fija un commit de despliegue solo si existe en el repo y pertenece a main (anti-fork / Sonar).
set -euo pipefail

HEAD_SHA="${1:-}"
if [ -z "$HEAD_SHA" ]; then
  echo "::error::SHA de despliegue vacío"
  exit 1
fi

git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null || {
  echo "::error::Commit ${HEAD_SHA} no existe en este repositorio"
  exit 1
}

if ! git merge-base --is-ancestor "${HEAD_SHA}" HEAD; then
  echo "::error::Commit ${HEAD_SHA} no está en la rama main — deploy bloqueado"
  exit 1
fi

git checkout --force "${HEAD_SHA}"
echo "Checkout OK — ${HEAD_SHA}"

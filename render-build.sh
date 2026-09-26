#!/usr/bin/env bash
# Build usado pelo Render (veja render.yaml).
set -euo pipefail

pip install --upgrade pip
pip install -r backend/requirements.txt

# Recompila o frontend quando o Node.js estiver disponível; senão usa o frontend/dist versionado.
if command -v npm >/dev/null 2>&1; then
  echo "[ParkHub] Compilando o frontend..."
  (cd frontend && npm ci --no-fund --no-audit && npm run build)
else
  echo "[ParkHub] Node.js indisponível: usando o frontend/dist já compilado."
fi

#!/usr/bin/env bash
# Deploys / updates the HealthCore stack in production. Run it ON THE VPS, from the repo folder:
#   bash infra/deploy-vps.sh
# Requirements on the VPS: git, Docker Engine and the Docker Compose plugin.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found: creating one from .env.example (edit it with your production values)."
  cp .env.example .env
  sed -i 's/^APP_MODE=.*/APP_MODE=production/; s/^UVICORN_RELOAD=.*/UVICORN_RELOAD=false/' .env
fi

git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps

#!/bin/sh
# Starts the two Next.js apps of the UI container:
#   website    -> port 3000
#   backoffice -> port 3001
# APP_MODE=dev (default): next dev with hot reloading.
# APP_MODE=production:    next build + next start.
set -e

APP_MODE="${APP_MODE:-dev}"
cd /app

# When the source code is bind-mounted, node_modules lives in a Docker volume.
# If a volume is empty (first run), install the dependencies there.
for app in website backoffice; do
  if [ ! -d "/app/$app/node_modules/next" ]; then
    echo "[start.sh] Installing dependencies for $app..."
    (cd "/app/$app" && npm ci)
  fi
done

if [ "$APP_MODE" = "production" ]; then
  echo "[start.sh] Production mode: building both apps..."
  (cd /app/website && npm run build)
  (cd /app/backoffice && npm run build)
  (cd /app/website && npm run start) &
  (cd /app/backoffice && npm run start) &
else
  echo "[start.sh] Development mode (hot reload)..."
  # Recompile the website's Tailwind CSS whenever the HTML changes.
  (cd /app/website && npm run css && npm run css:watch) &
  (cd /app/website && npx next dev --port 3000 --hostname 0.0.0.0) &
  (cd /app/backoffice && npx next dev --port 3001 --hostname 0.0.0.0) &
fi

# If any process dies, stop the container so Docker can report or restart it.
wait -n 2>/dev/null || wait
exit 1

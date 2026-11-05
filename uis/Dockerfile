# UI container: runs BOTH Next.js apps (website :3000, backoffice :3001).
FROM node:22-alpine

# libc6-compat helps some native Next.js/SWC binaries on Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies for each app separately (cached layers: only re-run when a lockfile changes).
COPY website/package.json website/package-lock.json ./website/
RUN cd website && npm ci

COPY backoffice/package.json backoffice/package-lock.json ./backoffice/
RUN cd backoffice && npm ci

# Copy the source code (in development it is replaced by the bind mount from docker-compose.yml).
COPY . .

RUN chmod +x /app/start.sh

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000 3001

# start.sh launches both apps. APP_MODE=dev (default) -> next dev with hot reload; APP_MODE=production -> next build + next start.
CMD ["/app/start.sh"]

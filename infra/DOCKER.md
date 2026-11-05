# Docker — development and production (Ticket #infra-40)

## Architecture

```
                  healthcore-net (Docker network)
 ┌───────────────────────────────┐        ┌──────────────────────────┐
 │ ui  (uis/Dockerfile)          │        │ api (services/Dockerfile)│
 │  website    next dev  :3000   │        │  FastAPI + Uvicorn :8000 │
 │  backoffice next dev  :3001 ──┼──────▶ │  --reload (dev)          │
 │   /api/* → http://api:8000    │        │  TinyDB (db.json)        │
 └───────────────────────────────┘        └──────────────────────────┘
```

- **One UI container** runs both Next.js apps (`uis/start.sh`): website on 3000, backoffice on 3001.
- **The API container** runs FastAPI with `uvicorn --reload`; dependencies come from `services/requirements.txt` and are installed with `uv pip install`.
- **Service-to-service by name:** the backoffice calls its own `/api/*` route, and the Next.js server forwards it to `http://api:8000` (`API_INTERNAL_URL`). No connection URL uses `localhost` inside the network.
- **Configuration** comes from the root `.env` (template: `.env.example`). `.env` is in `.gitignore`. If it doesn't exist, Compose uses safe defaults, so `docker compose up` works on a fresh clone.

## Development

```bash
docker compose up        # or: docker compose up --build after changing dependencies
```

| App | URL |
|---|---|
| Website | http://localhost:3000 |
| Backoffice | http://localhost:3001 (suppliers: /suppliers) |
| API | http://localhost:8000 · docs: http://localhost:8000/docs |

Hot reload: `./uis` and `./services/api` are bind-mounted. Changes to HTML, TSX or Python show up without rebuilding the image (`node_modules` and `.next` live in Docker volumes).

## Production (VPS)

`docker-compose.prod.yml` runs the same services and network, but without bind mounts, with `next build` + `next start`, Uvicorn without `--reload`, `restart: unless-stopped` and the database in the `api_data` volume.

On the VPS (once):

```bash
git clone https://github.com/4GeeksAcademy/mariascamino-latam-aie-pt2-proyecto_final.git healthcore
cd healthcore
cp .env.example .env     # edit: APP_MODE=production, UVICORN_RELOAD=false, CORS_ORIGINS=http://<VPS_IP>:3000,http://<VPS_IP>:3001
bash infra/deploy-vps.sh
```

To update: `bash infra/deploy-vps.sh` (it does `git pull` + `up -d --build`).
Open ports 3000, 3001 and 8000 in the VPS firewall if needed.

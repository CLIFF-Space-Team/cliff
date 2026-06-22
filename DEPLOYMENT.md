# CLIFF — Deployment (notcome.app)

Production runs on a single Ubuntu 22.04 VPS, containerized with Docker Compose,
fronted by host nginx, behind Cloudflare.

```
Cloudflare edge (HTTPS)
  └─ VPS nginx  (:80 / :443, cert = /etc/letsencrypt/live/notcome.app)
       ├─ /                      → frontend  (Next.js, 127.0.0.1:3000)
       ├─ /api/v1/, /ws/cliff    → backend   (FastAPI, 127.0.0.1:8000)
       ├─ /health /healthz /docs → backend
       └─ /metrics               → NOT exposed (Prometheus stays private)
            backend ── redis (internal compose network, never published)
```

## Stack

- **Compose file:** `docker-compose.prod.yml` (self-contained; ports bound to
  `127.0.0.1` only — nginx is the sole public entrypoint).
- **nginx site:** `deploy/nginx/notcome.app.conf` → `/etc/nginx/sites-available/notcome.app`.
- **Secrets:** `/opt/cliff/.env` on the VPS (from `.env.prod.example`). Never committed.

## First-time / manual deploy on the VPS

```bash
cd /opt/cliff
git pull
cp .env.prod.example .env        # then fill in NASA_API_KEY, AI_*, etc.
docker compose -f docker-compose.prod.yml up -d --build
```

nginx site + cert are already installed; reload after editing the conf:

```bash
cp deploy/nginx/notcome.app.conf /etc/nginx/sites-available/notcome.app
nginx -t && systemctl reload nginx
```

## Continuous deploy (GitHub Actions)

`.github/workflows/deploy.yml` deploys on every push to `main` (and via
**Run workflow**). It SSHes to the VPS and runs:

```
git reset --hard origin/main
cp deploy/nginx/notcome.app.conf → sites-available && nginx -t && reload
docker compose -f docker-compose.prod.yml up -d --build
curl /health  +  curl frontend   # fails the job if either is down
```

Required repo **Secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `151.243.109.155` |
| `VPS_USER` | `root` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | the private deploy key (full contents) |

## Health / smoke checks

```bash
curl https://notcome.app/health                     # backend + redis + scheduler
curl https://notcome.app/api/v1/threats/risk/snapshot
curl -o /dev/null -w '%{http_code}\n' https://notcome.app/   # frontend → 200
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

## Notes

- The autonomous scheduler starts on boot and runs a first cycle immediately, so
  `/threats/risk/snapshot` has data within ~1 minute of startup.
- `NASA_API_KEY=DEMO_KEY` works (rate-limited); set a real key in `.env`.
- AI endpoints (`/api/v1/ai/*`) return `503 AI_NOT_CONFIGURED` until `AI_API_KEY`
  is set — the dashboard hides those features gracefully.
- TLS: Cloudflare can use **Full (strict)** — the origin presents the real
  Let's Encrypt cert for `notcome.app`.

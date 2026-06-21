# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

CLIFF v2.0 is a greenfield rewrite of an asteroid threat-monitoring platform. Two independently deployable apps in one repo:

- **`backend/`** — Python 3.11 + FastAPI. Autonomous NASA pipeline (NeoWs, JPL Sentry, JPL Horizons, EONET) with Monte Carlo + ML hybrid risk scoring, persisted to Redis, broadcast over WebSocket.
- **`frontend/`** — Next.js 14 (App Router) + TypeScript strict. Pure-black professional theme (HSL token system, monochrome accent, threat-color-only-for-severity). Single canonical `SolarSystemScene` (R3F + Three.js) with NASA mission-derived GLB models and procedural fallback.

Most user-facing strings are Turkish. Preserve them when editing.

## Common commands

Run from the repo root unless stated. The root `package.json` workspaces the frontend and orchestrates dev with `concurrently`.

### Quick start
```bash
docker compose up -d                       # redis + backend + frontend
# or
npm run install:all                        # root + frontend npm + backend pip
npm run dev                                # backend on :8000, frontend on :3000
```

### Backend (`backend/`)
```bash
python main.py                             # dev, uvicorn reload, :8000
uvicorn main:app --workers 2               # production-ish
pytest -v                                  # tests (uses fakeredis)
pytest --cov=app --cov-report=term         # coverage
black --check app/ && isort --check-only app/ && flake8 app/ --max-line-length=127 --extend-ignore=E203,W503
python scripts/train_ml_model.py           # train ML risk classifier from JPL Sentry
```

### Frontend (`frontend/`)
```bash
npm install
npm run dev                                # :3000
npm run build && npm run start             # production
npm run lint                               # next lint
npm run typecheck                          # tsc --noEmit (strict)
npm run test:run                           # vitest one-shot
npm run test:coverage
```

> Asteroid fallback textures are generated procedurally at runtime
> (`textureFactory.ts`) — there is no bake step to run.

### Both apps
```bash
npm run dev                                # concurrently runs backend + frontend
npm run lint:backend && npm run lint:frontend
npm run test                                # both test suites
```

### Production deploy
- **Docker:** `docker compose up -d` (optional `--profile monitoring` for Prometheus + Grafana).
- **PM2 (Windows):** `.\deploy.ps1` does git pull → pip → npm build → `pm2 reload ecosystem.config.js`. Process map: `cliff-backend`, `cliff-frontend`.

## Architecture

### Backend — autonomous data pipeline
End-to-end flow when the scheduler ticks (default every 1800s):

1. **Ingest** — `app/scheduler/autonomous_loop.py` calls `app/nasa/neows.py:get_feed_today(7)` to pull the next-7-day NEO feed (JSON via shared `httpx.AsyncClient` in `app/nasa/http.py` with token-bucket rate limiter and retry-with-backoff that respects `Retry-After`).
2. **Normalize** — `app/pipeline/normalizer.py:normalize_neows()` flattens raw payloads into `app/domain/neo.py:NormalizedNeo` (typed Pydantic). Sentry overlay via `app/nasa/sentry.py:get_objects()` flips `sentry_listed=True` on matching entries.
3. **Persist seed records** — `app/pipeline/risk_store.py:upsert()` writes a placeholder `RiskRecord` (MINIMAL class) to Redis. Key schema: `cliff:risk:record:{neo_id}` (JSON), `cliff:risk:by_score` (ZSET), `cliff:risk:by_recompute` (ZSET).
4. **Recompute top-N** — for stale records (`stale_neo_ids(RISK_REFRESH_SECONDS)`), `app/pipeline/hybrid_engine.py:analyze_target()`:
   - Fetches Horizons ephemeris (`app/nasa/horizons.py`)
   - Estimates sigma from the distance series, runs Monte Carlo (`app/pipeline/monte_carlo.py:run()`, 10k samples, numpy)
   - Builds 7-feature vector and classifies via `app/pipeline/ml_classifier.py:MLRiskClassifier.classify()` (lazy-loads joblib model from `models/ml_risk_classifier.joblib`; falls back to a deterministic heuristic if the artifact is missing)
   - Composes hybrid score in [0,1] from class baseline + MC bonus + diameter bonus + Sentry bonus
5. **Delta + alert broadcast** — `risk_store.upsert()` returns a `RiskDelta` if class or score changed materially. Critical/HIGH transitions become `ThreatAlert`s pushed to `cliff:alerts:recent` (LIST) and emitted on the WS `threat_alerts` channel. All deltas go on `risk_updates`.
6. **Frontend reaction** — `frontend/providers/WebSocketProvider.tsx` listens on `/ws/cliff`, parses the discriminated-union `ServerEvent`, merges deltas into the `risk-snapshot` React Query cache via `queryClient.setQueriesData(...)`. UI re-renders without polling.

When adding a new NASA source: add a client in `app/nasa/`, register it in `autonomous_loop._cycle()`, surface read endpoints under `app/api/v1/endpoints/`, and (if it changes the risk score) extend `hybrid_engine._compose_score()`.

### Backend — module map
- `app/core/{config,logging,redis_client,exceptions}.py` — settings (pydantic-settings), structlog setup (Windows-safe), Redis pool, `ApiError` hierarchy with FastAPI handlers.
- `app/domain/{neo,risk,alert}.py` — pure Pydantic dataclasses, no FastAPI/Redis imports.
- `app/nasa/{http,neows,sentry,cad,horizons,eonet,cache}.py` — NASA clients with Redis-backed TTL cache via `cache.get_or_fetch(key, ttl, loader)`.
- `app/pipeline/...` — see above.
- `app/scheduler/autonomous_loop.py` — module-level `loop` singleton, started/stopped by `app/main.py` lifespan. Jittered interval, `_safe_cycle` swallows exceptions and continues.
- `app/api/v1/endpoints/{health,threats,nasa,horizons,impact,ai}.py` — thin endpoints delegating to services.
- `app/ai/{client,prompts,service}.py` — OpenAI-compatible client + threat explainer; `/ai/*` returns 503 if `AI_API_KEY` unset.
- `app/ws/{manager,events}.py` — channels: `risk_updates`, `threat_alerts`, `system_status`, `ai_stream`, `data_updates`. Inbound `ClientCommand` (subscribe/unsubscribe/ping). Outbound `ServerEvent` discriminated union.

### Frontend — single solar-system scene
The dashboard mounts exactly one 3D scene: `frontend/components/3d/SolarSystemScene.tsx`. There is **no** `ModernSolarSystem` / `ProfessionalSolarSystem` / `ThreatVisualizationSolarSystem` etc. — the v1 redundancy is gone.

- **Background:** `scene.background = 0x000000` and `gl.setClearColor(0x000000, 1)` — pure black, no navy.
- **Planetary backdrop:** `frontend/components/3d/PlanetaryBackdrop.tsx` mounts Mercury/Venus/Mars/Jupiter/Saturn (NASA mission textures) + an outer debris ring far beyond the ~90-unit camera range. Earth stays the focus at the origin; the planets are distant scenery only. Belt is skipped on `quality === 'low'`.
- **Asteroid resolution:** `frontend/components/3d/asteroids/AsteroidModelRegistry.ts` reads `frontend/public/asteroids/manifest.json` once. For known NEO ids (Bennu/Eros/Itokawa/Ryugu/Vesta) returns `kind: 'glb'`; for unknown returns `kind: 'procedural'` with deterministic seed (hash of neoId so the same asteroid always looks the same).
- **GLB loading:** `Asteroid.tsx` wraps `<GlbAsteroid>` in `<Suspense>` + a class-based `GlbBoundary` error boundary. If the GLB file is missing or fails, the procedural fallback renders. The model files themselves are downloaded manually — see `frontend/public/asteroids/README.md`.
- **Postprocessing** — restrained: only `SMAA + Bloom + Vignette`. No chromatic aberration, no color grading, no rainbow gradients. Bloom is keyed to the Sun's emissive output.

### Frontend — design system
Three rules in `frontend/app/globals.css`:
1. **Three surface tiers** — `#000` (page) / `#0a0a0a` (cards) / `#141414` (elevated) / `#1f1f1f` (popover/modal). No gradients.
2. **Hairline borders** — `rgba(255,255,255,0.06)` to `0.18`. Never solid white. Never a hue.
3. **Monochrome accent + threat color** — single near-white accent for CTAs; color reserved for `--threat-{critical,high,moderate,low}` only.

`tailwind.config.js` exposes the HSL CSS variables as Tailwind colors (`bg-surface-1`, `text-text-primary`, `bg-threat-critical`, etc.). The Radix-style aliases (`bg-card`, `text-muted-foreground`, `border-input`, ring) all alias back to the surface/text/border tokens, so shadcn-shaped primitives Just Work.

`frontend/components/ui/Surface.tsx` is the canonical wrapper — prefer it over ad-hoc `bg-white/5 border-white/10` divs.

### Frontend — data layer
- `frontend/lib/api-client.ts` — typed `apiFetch<T>` with `AbortController`, `Retry-After` respect, `ApiError` class with stable `code`.
- `frontend/lib/api-types.ts` — manual mirror of backend Pydantic. Keep in sync when domain models change.
- `frontend/lib/query-keys.ts` — single source of truth for React Query keys.
- `frontend/lib/ws-events.ts` — typed discriminated union mirroring `app/ws/events.py`.
- `frontend/providers/QueryProvider.tsx` — React Query default 5min staleTime, retries skip 4xx, exponential backoff capped at 15s.
- `frontend/providers/WebSocketProvider.tsx` — auto-reconnect (250ms→30s exp), 30s heartbeat, visibility-change pause, merges `risk_update` deltas into the React Query cache so all consumer components re-render without a refetch.

## Conventions

- **Settings** — never read `os.environ` directly; import `app.core.config.settings`. Add new flags as Pydantic `Field`s.
- **Logging** — `structlog.get_logger(__name__)` everywhere. Windows console handler is set up automatically; don't reinvent it.
- **Service singletons** — most modules expose `get_xxx_service()` returning a module-level singleton. Reuse those, don't instantiate per-request.
- **Backend lint** — Black + isort + flake8 (line length 127, E203/W503 ignored). CI enforces. Run before pushing.
- **Frontend lint/types** — `npm run lint && npm run typecheck`. Strict TypeScript (`noUncheckedIndexedAccess`, `noImplicitOverride`). React strict mode on.
- **Tests** — backend: pytest in `backend/tests/`. Frontend: vitest in `frontend/test/`. Both blocking in CI (no `|| echo` fallbacks).
- **NASA assets** — keep public domain texture catalog under `frontend/public/textures/nasa/...` and `frontend/public/earth-*.jpg`. GLB models go under `frontend/public/asteroids/{name}/model.glb` (manual setup, see that dir's README).
- **Secrets** — never commit `.env`/`.env.local`. Templates in `*.env.example`. `.gitignore` already locks them down.

## Things to know before changing them

- **`app/main.py` lifespan order matters** — Redis connect → NASA HTTP pool warm → scheduler start. On shutdown the order reverses (scheduler stop → WS shutdown → NASA HTTP close → Redis disconnect). Don't move things around without a reason.
- **Scheduler always runs `_safe_cycle` first on boot** so the dashboard has data within a minute. Boot-time cycle is `force_all=True`; subsequent cycles only recompute the stale top-N.
- **`SCHEDULER_ENABLED=false`** disables the autonomous loop entirely (useful for tests; CI uses it).
- **`AI_API_KEY` empty** — the `/api/v1/ai/*` endpoints return 503 with code `AI_NOT_CONFIGURED`. The dashboard gracefully hides AI features.
- **GLB models missing** — `ProceduralAsteroid` fallback handles every NEO. Don't gate the dashboard on the manual asset prep step.
- **`/health` is the auth-free health endpoint;** `/healthz` is its alias for k8s probes. `/metrics` is Prometheus and unauthenticated — front it with auth or a private subnet in production.
- **`reactStrictMode: true`** in `next.config.js` — useEffect runs twice in dev. Don't mutate refs in effects unless you handle the double-run case.
- **`output: 'standalone'`** in `next.config.js` — the production build emits `.next/standalone/server.js`. PM2 + Dockerfile both rely on this layout.

# CLIFF — Cosmic Level Intelligent Forecast Framework

> Profesyonel asteroid tehdit izleme platformu. NASA gerçek-zamanlı veri hattı, hibrit risk skorlaması (Horizons + Monte Carlo + ML), gerçek uzay aracı kaynaklı 3D modelleri ve pure-black profesyonel arayüz.

![version](https://img.shields.io/badge/version-2.0.0-black.svg)
![python](https://img.shields.io/badge/python-3.11+-blue.svg)
![next](https://img.shields.io/badge/next.js-14.2-black.svg)
![license](https://img.shields.io/badge/license-Proprietary-red.svg)

---

## Genel Bakış

CLIFF, NASA NeoWs / JPL Sentry / JPL Horizons / EONET API'lerini otonom bir pipeline üzerinden tüketen, hibrit risk modeliyle 30 dakikada bir yeniden hesaplayan, sonuçları Redis'te kalıcı tutan ve WebSocket üzerinden tarayıcıya anında ileten bir uzay tehdit platformudur.

**Versiyon 2.0** baştan yazıldı:
- Backend: temiz domain/pipeline/api/ws/scheduler katmanları
- Frontend: Next.js 14 App Router, strict TypeScript, profesyonel siyah tema (HSL token sistemi, hairline border'lar, monokrom accent, threat-color sadece şiddet için)
- 3D: tek kanonik `SolarSystemScene`, NASA misyon GLB modelleri (Bennu/Itokawa/Eros/Ryugu/Vesta) + procedural fallback
- Otonom pipeline: scheduler ingestor + normalizer + hybrid_engine + risk_store + WS broadcast

## Hızlı Başlangıç

### Gereksinimler
- Python 3.11+
- Node.js 18+
- Redis 7+
- (Opsiyonel) Docker / Docker Compose
- NASA API Key — `https://api.nasa.gov/`

### Docker ile (önerilen)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# .env dosyalarını düzenle: NASA_API_KEY, AI_API_KEY

docker compose up -d
# → http://localhost:3000  (frontend)
# → http://localhost:8000  (backend, /docs aktif)
```

### Manuel kurulum

```bash
# 1. Redis
docker run -d -p 6379:6379 --name cliff-redis redis:7-alpine

# 2. Backend
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env  # düzenle
python main.py        # → :8000

# 3. Frontend (yeni terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev           # → :3000
```

## Mimari

```
NASA NeoWs/Sentry/Horizons/EONET
            │
            ▼
   ingestor → normalizer → RiskStore (Redis)
                              │
                  hybrid_engine recompute
                  ├─ Horizons ephemeris
                  ├─ Monte Carlo (10k)
                  └─ ML classifier (joblib + heuristic fallback)
                              │
                  delta → WebSocket "risk_updates"
                              │
                       Frontend (React Query merge)
                              │
                  SolarSystemScene + dashboard panels
```

### Backend dizini

```
backend/
├── app/
│   ├── core/         # config, logging, redis, exceptions
│   ├── domain/       # NEO, RiskRecord, ThreatAlert (pure dataclasses)
│   ├── nasa/         # NeoWs, Sentry, CAD, Horizons, EONET clients
│   ├── pipeline/     # Normalizer + MonteCarlo + ML + hybrid_engine + risk_store
│   ├── scheduler/    # Autonomous loop
│   ├── api/v1/       # REST endpoints
│   ├── ai/           # OpenAI-compatible chat + threat explainer
│   └── ws/           # WebSocket subscription manager
├── scripts/
│   └── train_ml_model.py
├── tests/
└── main.py
```

### Frontend dizini

```
frontend/
├── app/
│   ├── layout.tsx, page.tsx
│   ├── (dashboard)/dashboard/   # Mission control
│   └── impact/, impact/meme/[shareId]/
├── components/
│   ├── ui/           # Surface, Button, Card, StatusPill, Skeleton, …
│   ├── layout/       # DashboardHeader, Sidebar, SystemStatusIndicator
│   ├── threat/       # RiskSnapshotPanel, AlertFeed
│   ├── asteroid/     # AsteroidDetailDrawer
│   ├── impact/       # ImpactParameterForm, Visualization3D, ResultPanel, MemeRenderer
│   └── 3d/
│       ├── SolarSystemScene.tsx
│       ├── primitives/          # Sun, Earth, Planet, Saturn, Moon, StarField
│       ├── asteroids/           # Asteroid, GLB, procedural, registry, belt
│       ├── controls/, postprocessing/
├── hooks/, lib/, providers/, stores/
├── public/asteroids/  # GLB modeller (manuel indirilir, README.md'ye bak)
└── test/
```

## API Yüzeyi

| Endpoint | Method | Açıklama |
|---|---|---|
| `/health`, `/healthz` | GET | Sağlık kontrolü (Redis + scheduler durumu) |
| `/api/v1/threats/risk/snapshot?limit=50` | GET | Top-N hibrit risk kayıtları |
| `/api/v1/threats/risk/{neo_id}` | GET | Tek NEO risk detayı |
| `/api/v1/threats/alerts/recent` | GET | Son tehdit uyarıları |
| `/api/v1/threats/refresh` | POST | Manuel scheduler tetikle |
| `/api/v1/horizons/asteroid/{neo_id}/hybrid-analysis` | GET | Tek NEO için canlı hibrit analiz |
| `/api/v1/horizons/asteroid/{neo_id}/{ephemeris,future-positions}` | GET | Horizons ham veri |
| `/api/v1/nasa/{neo,sentry,cad,eonet}/...` | GET | NASA passthrough proxy |
| `/api/v1/impact/calculate` | POST | Çarpma fiziği hesabı |
| `/api/v1/ai/{models,chat,threat-explanation}` | GET/POST | AI servisi (OpenAI uyumlu) |
| `/ws/cliff` | WS | Subscription kanalları: `risk_updates`, `threat_alerts`, `system_status`, `ai_stream`, `data_updates` |
| `/metrics` | GET | Prometheus |

Geliştirme sırasında interaktif dokümantasyon: `http://localhost:8000/docs`

## Yapılandırma

`backend/.env`:
```env
ENVIRONMENT=development
NASA_API_KEY=DEMO_KEY            # gerçek anahtar prod'da zorunlu
REDIS_URL=redis://localhost:6379/0
AI_BASE_URL=https://api.openai.com
AI_API_KEY=                      # opsiyonel; yoksa /ai/* 503
AI_MODEL=meta/llama-4-maverick-instruct
INGEST_INTERVAL_SECONDS=1800
RISK_REFRESH_SECONDS=3600
WATCHLIST_SIZE=30
```

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## NASA 3D Asset'leri

`frontend/public/asteroids/README.md` dosyasında detaylı kurulum talimatı var. Özet:

```bash
# NASA 3D Resources'tan OBJ indir (Bennu, Eros, Itokawa, Ryugu, Vesta)
# Optimize:
gltf-transform optimize bennu.glb bennu.glb \
  --texture-compress webp --texture-resize 2048
# Yerleştir: frontend/public/asteroids/bennu/model.glb (vb.)
```

GLB dosyaları olmadan da sahne çalışır — `AsteroidModelRegistry` bilinmeyen NEO'lar için procedural icosahedron render eder.

## Geliştirme

```bash
# Lint / type-check
cd frontend && npm run lint && npm run typecheck
cd backend  && black --check app/ && isort --check-only app/ && flake8 app/

# Testler
cd frontend && npm run test:run     # vitest
cd backend  && pytest -v            # pytest

# Build
cd frontend && npm run build        # Next.js standalone output
docker compose build                 # tüm imajlar
```

## Deploy

### Docker Compose (önerilen)
```bash
docker compose up -d                          # core stack
docker compose --profile monitoring up -d     # + Prometheus + Grafana
```

### PM2 (Windows / Linux)
```bash
npm run build                  # frontend build (.next/standalone üretir)
pm2 start ecosystem.config.js  # cliff-backend + cliff-frontend
```

### Tek-tıkla Windows
```powershell
.\deploy.ps1   # git pull → pip → npm build → pm2 reload
```

## Tehlike Notu / Disclaimer

CLIFF basitleştirilmiş ölçeklendirme yasaları (Collins/Holsapple) ve hibrit istatistik kullanır; **operasyonel karar amaçlı değildir**. Gerçek planet defense kararları için **NASA Planetary Defense Coordination Office** ve **JPL Sentry** birincil kaynaklardır.

## Lisans

Proprietary — bkz. [LICENSE](LICENSE). Yarışma / fork / commercial kullanım yasaktır.

---

Made by **kynuxdev** · cliff.kynux.dev · admin@kynux.dev

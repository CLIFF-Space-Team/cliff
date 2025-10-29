# 🌌 CLIFF - NASA Asteroid Threat Visualization System

<div align="center">

![CLIFF Banner](https://img.shields.io/badge/NASA-Space%20Apps%20Challenge-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black?style=for-the-badge&logo=next.js)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Real-time 3D Asteroid Threat Monitoring and Analysis Platform**

*Powered by NASA APIs, AI-driven insights, and advanced 3D visualization*

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [API Documentation](#-api-documentation) • [License](#-license)

</div>

---

## 🎯 Features

### 🚀 Core Capabilities

- **Real-Time Monitoring**: Live asteroid tracking using NASA's CNEOS Sentry and NeoWs APIs
- **3D Visualization**: Interactive solar system with WebGL-powered asteroid trajectories
- **AI Analysis**: Google Gemini-powered threat assessment and natural language explanations
- **Risk Assessment**: Multi-factor risk scoring (Torino Scale, Palermo Scale, distance, size)
- **WebSocket Streaming**: Real-time data updates without page refresh
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile devices

### 🎨 Frontend Features

- **Modern UI/UX**: Glassmorphism design with smooth animations
- **Interactive 3D Globe**: Real-time Earth visualization with asteroid approach indicators
- **Threat Dashboard**: Live counters for critical, high, medium, low, and no-risk objects
- **Timeline Charts**: Visual representation of upcoming close approaches (7/30/90 day windows)
- **AI Chat Interface**: Natural language queries about space threats
- **Multi-language Support**: Turkish and English localization
- **Dark/Light Themes**: Customizable appearance with theme persistence

### 🔧 Backend Features

- **FastAPI Framework**: High-performance async API with automatic OpenAPI documentation
- **MongoDB Integration**: Scalable NoSQL database for astronomical data
- **Automated Scheduling**: 30-minute refresh cycles for NASA data
- **Data Normalization**: Intelligent merging of multiple NASA data sources
- **SSE Support**: Server-Sent Events for live dashboard updates
- **Comprehensive Testing**: 20+ test suites covering all endpoints
- **Error Handling**: Graceful degradation and detailed logging

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI 0.104.1
- **Runtime**: Python 3.11+
- **Database**: MongoDB (Motor async driver)
- **Cache**: Redis
- **AI/ML**: Google Gemini AI, scikit-learn
- **Data Processing**: NumPy, SciPy, astroquery
- **Task Scheduling**: APScheduler
- **WebSockets**: Python WebSockets 12.0

### Frontend
- **Framework**: Next.js 14.1 (React 18.2)
- **Language**: TypeScript 5.3
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **UI Components**: Radix UI, Tailwind CSS
- **State Management**: Zustand, TanStack Query
- **Charts**: Recharts, D3.js
- **Animations**: Framer Motion, GSAP

### DevOps
- **Containerization**: Docker, Docker Compose
- **Testing**: Pytest (backend), Vitest (frontend)
- **Linting**: Black, isort, flake8, ESLint
- **Monitoring**: Prometheus, Sentry

---

## 📦 Installation

### Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher
- **MongoDB**: 4.4 or higher (local or cloud)
- **Redis**: 6.0 or higher (optional, for caching)
- **NASA API Key**: Get one at [NASA API Portal](https://api.nasa.gov/)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/kynuxdev/cliff.git
cd cliff
```

### 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp env.example .env
# Edit .env and add your NASA_API_KEY
```

**Backend Environment Variables** (`.env`):
```env
NASA_API_KEY=your_nasa_api_key_here
MONGODB_URL=mongodb://localhost:27017/cliff_db
MONGODB_NAME=cliff_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key-min-32-characters
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
DEBUG=true
```

### 3️⃣ Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
cp env.local.example .env.local
```

**Frontend Environment Variables** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 🚀 Usage

### Start MongoDB (if running locally)

```bash
# Windows (if installed as service):
net start MongoDB

# macOS/Linux:
sudo systemctl start mongod
```

### Start Backend

```bash
cd backend
python main.py
```

Backend will run on `http://localhost:8000`

**API Documentation**: `http://localhost:8000/docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

### Initial Data Load

Trigger the first sync to fetch NASA data:

```bash
curl -X POST http://localhost:8000/api/v1/asteroids/sync
```

Or visit: `http://localhost:8000/api/v1/asteroids/sync` in your browser

---

## 📡 API Documentation

### Asteroid Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/asteroids/overview` | Get threat counters summary |
| `GET` | `/api/v1/asteroids/approaches?window=7d` | Get upcoming close approaches |
| `GET` | `/api/v1/asteroids/top?limit=10` | Get top risky asteroids |
| `GET` | `/api/v1/asteroids/:neoId` | Get detailed asteroid info |
| `GET` | `/api/v1/asteroids/events` | SSE stream for live updates |
| `POST` | `/api/v1/asteroids/sync` | Manually trigger data refresh |

### AI Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/ai/analyze-threat` | AI-powered threat analysis |
| `POST` | `/api/v1/ai/chat` | Natural language conversation |
| `GET` | `/api/v1/ai/image-analysis/:neoId` | Visual threat analysis |

### Space Weather Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/space-weather/current` | Current space weather data |
| `GET` | `/api/v1/space-weather/forecast` | Solar activity forecast |

### Solar System Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/solar-system/data` | Complete solar system state |
| `GET` | `/api/v1/solar-system/planets` | Planetary positions |

---

## 📊 Data Flow

```
┌─────────────┐
│  NASA APIs  │
│  (NeoWs +   │
│   Sentry)   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Schedulers    │
│  (30 min auto)  │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│    Ingestors     │
│  (Data Fetching) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Normalizers    │
│ (Data Merging)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Risk Engine     │
│ (Scoring Logic)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    MongoDB       │
│  (Persistence)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   FastAPI        │
│ (REST + SSE)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Next.js Client  │
│ (3D + Dashboard) │
└──────────────────┘
```

---

## 🎨 Design System

### Color Palette

- **Critical Risk**: `#ef4444` (Red)
- **High Risk**: `#f97316` (Orange)
- **Medium Risk**: `#eab308` (Yellow)
- **Low Risk**: `#22c55e` (Green)
- **No Risk**: `#64748b` (Slate Gray)

### Typography

- **Headings**: Geist Sans, font-semibold
- **Body**: Geist Sans, font-normal
- **Monospace**: Geist Mono

### Effects

- **Glassmorphism**: `backdrop-blur-lg` + `bg-white/5`
- **Shadows**: Multi-layer with color-matched glows
- **Animations**: Smooth 300ms transitions with easing

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
# Or with coverage:
pytest --cov=app --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm test
# Or with UI:
npm run test:ui
# Or with coverage:
npm run test:coverage
```

---

## 🏗️ Project Structure

```
cliff/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # API route handlers
│   │   ├── models/         # MongoDB models
│   │   ├── services/       # Business logic (ingestors, normalizers, etc.)
│   │   ├── core/           # Config, database
│   │   └── websocket/      # WebSocket handlers
│   ├── main.py             # FastAPI app entry
│   └── requirements.txt
├── frontend/
│   ├── app/                # Next.js pages (App Router)
│   ├── components/         # React components
│   │   ├── 3d/            # Three.js components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── ai/            # AI interface
│   │   └── ui/            # Base UI components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state stores
│   ├── types/              # TypeScript definitions
│   └── public/             # Static assets
├── docker-compose.yml      # Docker orchestration
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🔒 Security

- **API Keys**: Never commit `.env` files (use `.env.example` templates)
- **JWT Authentication**: Secure user sessions with HS256 encryption
- **CORS**: Configured for specific origins only
- **Input Validation**: Pydantic models for all API inputs
- **Rate Limiting**: Protection against API abuse
- **Dependency Scanning**: Regular updates for vulnerabilities

---

## 📈 Performance

- **Frontend Rendering**: 60+ FPS for 3D scenes
- **API Response Time**: <100ms (with cache <10ms)
- **Data Processing**: ~2 seconds for 2000 asteroid records
- **Database Queries**: Optimized with compound indexes
- **Bundle Size**: Optimized with tree-shaking and code splitting

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **NASA**: For providing open access to asteroid data via NeoWs and CNEOS APIs
- **Google**: For Gemini AI API
- **Space Apps Challenge**: For inspiring this project
- **Three.js Community**: For excellent 3D visualization tools
- **Open Source Community**: For all the amazing libraries used

---

## 📚 Resources

- [NASA NeoWs API](https://api.nasa.gov/)
- [CNEOS Sentry System](https://cneos.jpl.nasa.gov/sentry/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Three.js Documentation](https://threejs.org/docs/)

---

<div align="center">

**Made with ❤️ by [kynuxdev](https://github.com/kynuxdev)**

*Monitoring the cosmos, one asteroid at a time* 🌠

</div>


# 🌌 CLIFF - Cosmic Level Intelligent Forecast Framework

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![Next.js](https://img.shields.io/badge/next.js-14.1-black.svg)
![AI](https://img.shields.io/badge/AI-Meta%20Llama%204-purple.svg)

**Advanced AI-Powered Space Threat Monitoring Platform**

[English](#english) • [Türkçe](#türkçe) • [Features](#key-features) • [Installation](#installation) • [API](#api-documentation)

</div>

---

## English

### 🎯 Overview

**CLIFF** is a cutting-edge real-time asteroid threat monitoring and analysis platform powered by AI. Utilizing NASA's public APIs, advanced AI models, and stunning 3D visualizations, CLIFF provides comprehensive space threat assessment and educational tools for both scientists and the public.

### 🚀 Key Features

#### 🤖 AI-Powered Analysis
- **Meta Llama 4 Maverick Integration**: State-of-the-art language model for threat analysis
- **OpenAI-Compatible API**: Seamless integration with industry-standard AI providers
- **Real-time Threat Assessment**: Automated risk scoring using Torino and Palermo scales
- **Natural Language Interface**: Interactive AI chat for space science queries

#### 🌍 Real-Time Monitoring
- **Live Asteroid Tracking**: NASA CNEOS Sentry and NeoWs API integration
- **Dynamic 3D Solar System**: WebGL-based interactive planetary and asteroid orbits
- **Intelligent Threat Filtering**: Critical, high, medium, low, and no-threat categories
- **Approach Timeline**: 7/30/90-day windows for upcoming close approaches

#### 🎮 Impact Simulator
- **Physics-Based Calculations**: Accurate energy, crater, and shockwave modeling
- **Cinematic 3D Visualization**: Atmospheric entry, plasma trails, explosion effects
- **Customizable Parameters**: Size, velocity, angle, composition, target location
- **Scientific Analysis**: TNT equivalent, crater dimensions, damage estimates

#### 📊 Professional Dashboard
- **Modern UI/UX**: Glassmorphism design with smooth animations
- **Live Statistics**: Real-time threat counters and charts
- **Interactive World Map**: Asteroid approach visualization on Earth
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile

### 🛠 Technology Stack

**Backend**
```
Python 3.11+ | FastAPI | MongoDB | Redis
Meta Llama 4 Maverick | NumPy | SciPy
WebSockets | APScheduler | Structlog
```

**Frontend**
```
React 18 | Next.js 14.1 | TypeScript 5.3
Three.js | React Three Fiber | Zustand
TanStack Query | Tailwind CSS | Framer Motion
```

### 📦 Quick Start

#### Prerequisites
- Python 3.11+
- Node.js 18.0+
- MongoDB (local or cloud)
- NASA API Key ([Get one here](https://api.nasa.gov/))

#### Installation

**1. Clone Repository**
```bash
git clone https://github.com/CLIFF-Space-Team/cliff.git
cd cliff
```

**2. Backend Setup**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
copy env.example .env
# Edit .env and add your API keys
```

**3. Frontend Setup**
```bash
cd ../frontend
npm install
copy env.local.example .env.local
# Edit .env.local if needed
```

**4. Start Services**
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**5. Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 🔧 Configuration

**Backend `.env`:**
```env
AI_BASE_URL=https://your-ai-provider.com
AI_API_KEY=your_api_key_here
AI_MODEL=meta/llama-4-maverick-instruct
NASA_API_KEY=your_nasa_api_key
MONGODB_URL=your_mongodb_connection_string
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 📡 API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/ai/models` | List available AI models |
| `POST` | `/api/v1/ai/chat` | AI chat completion |
| `GET` | `/api/v1/asteroids/overview` | Threat overview statistics |
| `GET` | `/api/v1/asteroids/approaches` | Upcoming asteroid approaches |

Full API documentation available at: http://localhost:8000/docs

### 🏗 Project Structure

```
cliff/
├── backend/              # Python FastAPI Backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core configuration
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   └── websocket/   # WebSocket handlers
│   ├── main.py          # Application entry point
│   └── requirements.txt # Python dependencies
│
├── frontend/            # Next.js Frontend
│   ├── app/            # Next.js 14 App Router
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── stores/         # State management
│   └── types/          # TypeScript types
│
└── docker-compose.yml  # Docker configuration
```

### 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ JWT authentication with HS256 encryption
- ✅ CORS policy with whitelist
- ✅ Input validation via Pydantic models
- ✅ Rate limiting for API protection
- ✅ HTTPS enforced in production

### 📄 License

**Proprietary License** - See [LICENSE](LICENSE) for details.

**⚠️ WARNING**: This project is protected by copyright. Unauthorized use, including participation in competitions (TÜBİTAK, NASA, etc.), is strictly prohibited.

---

## Türkçe

### 🎯 Genel Bakış

**CLIFF**, yapay zeka destekli, gerçek zamanlı asteroid tehdidi izleme ve analiz platformudur. NASA'nın açık API'lerini, gelişmiş AI modellerini ve etkileyici 3D görselleştirmeleri kullanarak hem bilim insanlarına hem de halka kapsamlı uzay tehdidi değerlendirmesi ve eğitim araçları sunar.

### 🚀 Öne Çıkan Özellikler

#### 🤖 Yapay Zeka Destekli Analiz
- **Meta Llama 4 Maverick Entegrasyonu**: Tehdit analizi için son teknoloji dil modeli
- **OpenAI-Uyumlu API**: Endüstri standardı AI sağlayıcıları ile sorunsuz entegrasyon
- **Gerçek Zamanlı Tehdit Değerlendirmesi**: Torino ve Palermo ölçekleri ile otomatik risk skorlama
- **Doğal Dil Arayüzü**: Uzay bilimi sorguları için interaktif AI sohbet

#### 🌍 Gerçek Zamanlı İzleme
- **Canlı Asteroid Takibi**: NASA CNEOS Sentry ve NeoWs API entegrasyonu
- **Dinamik 3D Güneş Sistemi**: WebGL tabanlı interaktif gezegen ve asteroid yörüngeleri
- **Akıllı Tehdit Filtreleme**: Kritik, yüksek, orta, düşük ve tehlike içermeyen kategoriler
- **Yaklaşma Zaman Çizelgesi**: Gelecek yaklaşımlar için 7/30/90 günlük pencereler

#### 🎮 Çarpma Simülatörü
- **Fizik Tabanlı Hesaplamalar**: Hassas enerji, krater ve şok dalgası modellemesi
- **Sinematik 3D Görselleştirme**: Atmosfer girişi, plazma izleri, patlama efektleri
- **Özelleştirilebilir Parametreler**: Boyut, hız, açı, kompozisyon, hedef konum
- **Bilimsel Analiz**: TNT eşdeğeri, krater boyutları, hasar tahminleri

#### 📊 Profesyonel Dashboard
- **Modern Tasarım**: Glassmorphism tasarım dili ve akıcı animasyonlar
- **Canlı İstatistikler**: Gerçek zamanlı tehdit sayaçları ve grafikler
- **İnteraktif Dünya Haritası**: Asteroid yaklaşımlarının Dünya üzerinde gösterimi
- **Duyarlı Tasarım**: Masaüstü, tablet ve mobil cihazlarda kusursuz deneyim

### 🛠 Teknoloji Yığını

**Backend**
```
Python 3.11+ | FastAPI | MongoDB | Redis
Meta Llama 4 Maverick | NumPy | SciPy
WebSockets | APScheduler | Structlog
```

**Frontend**
```
React 18 | Next.js 14.1 | TypeScript 5.3
Three.js | React Three Fiber | Zustand
TanStack Query | Tailwind CSS | Framer Motion
```

### 📦 Hızlı Başlangıç

#### Gereksinimler
- Python 3.11+
- Node.js 18.0+
- MongoDB (yerel veya cloud)
- NASA API Anahtarı ([Buradan alın](https://api.nasa.gov/))

#### Kurulum

**1. Depoyu Klonlayın**
```bash
git clone https://github.com/CLIFF-Space-Team/cliff.git
cd cliff
```

**2. Backend Kurulumu**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
copy env.example .env
# .env dosyasını düzenleyin ve API anahtarlarınızı ekleyin
```

**3. Frontend Kurulumu**
```bash
cd ../frontend
npm install
copy env.local.example .env.local
# Gerekirse .env.local dosyasını düzenleyin
```

**4. Servisleri Başlatın**
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**5. Uygulamaya Erişin**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Dokümantasyonu: http://localhost:8000/docs

### 🔧 Yapılandırma

**Backend `.env`:**
```env
AI_BASE_URL=https://ai-saglayiciniz.com
AI_API_KEY=api_anahtariniz
AI_MODEL=meta/llama-4-maverick-instruct
NASA_API_KEY=nasa_api_anahtariniz
MONGODB_URL=mongodb_baglanti_stringiniz
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 📡 API Dokümantasyonu

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/health` | Sağlık kontrolü |
| `GET` | `/api/v1/ai/models` | Mevcut AI modellerini listele |
| `POST` | `/api/v1/ai/chat` | AI sohbet tamamlama |
| `GET` | `/api/v1/asteroids/overview` | Tehdit özet istatistikleri |
| `GET` | `/api/v1/asteroids/approaches` | Yaklaşan asteroid yaklaşımları |

Tam API dokümantasyonu: http://localhost:8000/docs

### 🏗 Proje Yapısı

```
cliff/
├── backend/              # Python FastAPI Backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Temel yapılandırma
│   │   ├── models/      # Veritabanı modelleri
│   │   ├── services/    # İş mantığı
│   │   └── websocket/   # WebSocket yöneticileri
│   ├── main.py          # Uygulama giriş noktası
│   └── requirements.txt # Python bağımlılıkları
│
├── frontend/            # Next.js Frontend
│   ├── app/            # Next.js 14 App Router
│   ├── components/     # React bileşenleri
│   ├── hooks/          # Özel React hooks
│   ├── services/       # API servisleri
│   ├── stores/         # State yönetimi
│   └── types/          # TypeScript tipleri
│
└── docker-compose.yml  # Docker yapılandırması
```

### 🔒 Güvenlik

- ✅ Hassas veriler için environment variables
- ✅ HS256 şifrelemeli JWT authentication
- ✅ Whitelist ile CORS politikası
- ✅ Pydantic modelleri ile input validation
- ✅ API koruması için rate limiting
- ✅ Production'da HTTPS zorunlu

### 📈 Performance Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| API Response Time | <100ms | ~75ms ✅ |
| 3D Render FPS | >60 | 67 FPS ✅ |
| Database Query | <50ms | ~35ms ✅ |
| Bundle Size | <500KB | ~420KB ✅ |

### 🌐 Deployment

**Docker Deployment:**
```bash
docker-compose up -d
```

**Manual Deployment:**
```bash
# Backend
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app

# Frontend
cd frontend
npm run build
npm start
```

### 🏆 Achievements

- 🥇 **NASA Space Apps Challenge 2025** - Turkey Aksaray 1st Place
- 🇹🇷 Representing Turkey in International Space Arena
- 🔬 **TÜBİTAK 4006** Science Fairs Program Participant
- 🎓 **TÜBİTAK 2204** High School Research Projects Program Participant

### 👥 Team

**CLIFF Space Team** - A group of high school students from Aksaray, Turkey, reaching for the stars.

**Project Leader**: kynuxdev  
**Contact**: admin@kynux.dev  
**Website**: cliff.kynux.dev

### 📄 License

**Copyright © 2025 kynuxdev - All Rights Reserved**

This project is licensed under a proprietary license. See [LICENSE](LICENSE) for details.

**⚠️ IMPORTANT**: Unauthorized use, including participation in competitions (TÜBİTAK, NASA, etc.), commercial use, or redistribution is strictly prohibited and will result in legal action.

### 🙏 Acknowledgments

- **NASA** - Open data APIs (NeoWs, CNEOS, GIBS)
- **TÜBİTAK** - Support through 4006 and 2204 programs
- **Open Source Community** - FastAPI, Next.js, Three.js, and more

### 📞 Contact & Links

- 🌐 **Website**: [cliff.kynux.dev](https://cliff.kynux.dev)
- 📧 **Email**: admin@kynux.dev
- 💻 **GitHub**: [CLIFF-Space-Team](https://github.com/CLIFF-Space-Team/cliff)
- 📚 **API Docs**: [API Documentation](http://localhost:8000/docs)

---

<div align="center">

**Made with ❤️ by CLIFF Space Team**

*Monitoring the cosmos, one asteroid at a time* 🌠

[![NASA Space Apps](https://img.shields.io/badge/NASA-Space%20Apps%202025-blue?style=for-the-badge)](https://www.spaceappschallenge.org/)
[![TÜBİTAK](https://img.shields.io/badge/TÜBİTAK-4006%20%7C%202204-red?style=for-the-badge)](https://www.tubitak.gov.tr/)

</div>

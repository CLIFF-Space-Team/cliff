# 🚀 CLIFF - Windows VDS Kurulum Adımları

## 📋 Ön Gereksinimler

VDS'nizde olması gerekenler:
- ✅ Windows Server (2019 veya üzeri)
- ✅ Nginx çalışıyor
- ✅ Domain DNS ayarı yapılmış (`cliff.kynux.dev` → VDS IP)

---

## ADIM 1: Gerekli Yazılımları Kurun

### 1.1 Python 3.11 Kurulumu
```powershell
# Python indirin ve kurun
# https://www.python.org/downloads/
# İndirme sırasında "Add Python to PATH" seçeneğini işaretleyin

# Python kurulumunu kontrol edin
python --version
pip --version
```

### 1.2 Node.js 18+ Kurulumu
```powershell
# Node.js indirin ve kurun
# https://nodejs.org/

# Node.js kurulumunu kontrol edin
node --version
npm --version
```

### 1.3 Git Kurulumu
```powershell
# Git for Windows indirin ve kurun
# https://git-scm.com/download/win

# Git kurulumunu kontrol edin
git --version
```

### 1.4 PM2 Kurulumu (Process Manager)
```powershell
# PowerShell'i Administrator olarak açın
npm install -g pm2
npm install -g pm2-windows-service

# PM2'yi Windows servisi olarak kurun
pm2-service-install -n PM2
```

---

## ADIM 2: Proje Kurulumu

### 2.1 Proje Dizini Oluşturma
```powershell
# PowerShell Administrator olarak açın
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\cliff" -Force
cd C:\inetpub\wwwroot\cliff
```

### 2.2 Git Konfigürasyonu ve Repo Klonlama
```powershell
# Git line ending ayarı (Windows için önemli!)
git config --global core.autocrlf false

# Repoyu klonlayın (kendi repo adresinizi yazın)
git clone https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git .

# Doğru branch'e geçin
git checkout main
```

### 2.3 Backend Kurulumu
```powershell
cd C:\inetpub\wwwroot\cliff\backend

# Python bağımlılıklarını kurun
pip install -r requirements.txt

# Backend'i test edin
python main.py
# Ctrl+C ile durdurun
```

### 2.4 Frontend Kurulumu
```powershell
cd C:\inetpub\wwwroot\cliff\frontend

# Node modüllerini kurun
npm install

# Production build alın
npm run build

# Frontend'i test edin
npm start
# Ctrl+C ile durdurun
```

### 2.5 .env.production Dosyası Oluşturma
```powershell
cd C:\inetpub\wwwroot\cliff\frontend

# .env.production dosyası oluşturun
@"
NEXT_PUBLIC_API_URL=https://cliff.kynux.dev/api
NEXT_PUBLIC_WS_URL=wss://cliff.kynux.dev/ws
NODE_ENV=production
PORT=3001
"@ | Out-File -FilePath .env.production -Encoding utf8
```

---

## ADIM 3: PM2 ile Servisleri Başlatma

### 3.1 Servisleri Başlatın
```powershell
cd C:\inetpub\wwwroot\cliff

# PM2 ile başlatın
pm2 start ecosystem.config.js

# Durumu kontrol edin
pm2 status

# Logları kontrol edin
pm2 logs cliff-backend --lines 50
pm2 logs cliff-frontend --lines 50

# Her şey çalışıyorsa kaydedin
pm2 save
```

### 3.2 Webhook Listener Başlatma
```powershell
cd C:\inetpub\wwwroot\cliff

# Webhook secret oluşturun (güçlü bir şifre)
$SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
echo "WEBHOOK_SECRET: $SECRET"
# Bu SECRET'ı not alın! GitHub'a ekleyeceksiniz.

# Webhook listener'ı başlatın
$env:WEBHOOK_SECRET = $SECRET
pm2 start webhook-listener.js --name cliff-webhook

# Kaydedin
pm2 save
```

---

## ADIM 4: SSL Sertifikası Kurulumu

### 4.1 Win-ACME Kurulumu
```powershell
# Win-ACME indirin
cd C:\
Invoke-WebRequest -Uri "https://github.com/win-acme/win-acme/releases/download/v2.2.7/win-acme.v2.2.7.1612.x64.pluggable.zip" -OutFile "win-acme.zip"

# Çıkarın
Expand-Archive -Path "win-acme.zip" -DestinationPath "C:\win-acme"
cd C:\win-acme
```

### 4.2 SSL Sertifikası Alma
```powershell
# Win-ACME ile sertifika alın
.\wacs.exe --source manual --host cliff.kynux.dev --webroot C:/nginx/html --store pemfiles --pemfilespath C:/nginx/ssl

# Sorular:
# - Accept terms? -> Y
# - Friendly name? -> cliff.kynux.dev
# - Web root path? -> C:/nginx/html (önceden yazılı olacak)
# - PEM files path? -> C:/nginx/ssl (önceden yazılı olacak)
```

---

## ADIM 5: Nginx Konfigürasyonu

### 5.1 Nginx Config Düzenleme
```powershell
# Mevcut nginx.conf'u düzenleyin
notepad C:\nginx\conf\nginx.conf
```

**`nginx-cliff-config.txt` dosyasındaki içeriği nginx.conf'un SONUNA (son } karakterinden önce) ekleyin!**

### 5.2 Nginx Test ve Yeniden Başlatma
```powershell
cd C:\nginx

# Konfigürasyonu test edin
.\nginx.exe -t

# Hata yoksa yeniden başlatın
.\nginx.exe -s reload

# Veya servisi yeniden başlatın
Restart-Service nginx
```

---

## ADIM 6: GitHub Ayarları

### 6.1 GitHub Secrets Ekleme

GitHub reponuza gidin:
1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** tıklayın
3. Şu secrets'ları ekleyin:

**Secret 1:**
- Name: `WEBHOOK_URL`
- Value: `http://VDS_IP_ADRESINIZ:9000/webhook`

**Secret 2:**
- Name: `WEBHOOK_SECRET`
- Value: (ADIM 3.2'de oluşturduğunuz SECRET değeri)

### 6.2 İlk Deploy Test
```powershell
# Lokal bir değişiklik yapın
cd C:\inetpub\wwwroot\cliff
echo "# Test" >> README.md

# Commit ve push yapın
git add .
git commit -m "test: ilk otomatik deployment testi"
git push origin main

# Webhook loglarını izleyin
pm2 logs cliff-webhook --lines 100

# Deployment loglarını izleyin
pm2 logs cliff-backend --lines 50
pm2 logs cliff-frontend --lines 50
```

---

## ADIM 7: Test ve Doğrulama

### 7.1 Servis Durumunu Kontrol
```powershell
# PM2 durumu
pm2 status

# Port dinlemelerini kontrol
netstat -ano | findstr "3001"  # Frontend
netstat -ano | findstr "8001"  # Backend
netstat -ano | findstr "9000"  # Webhook
```

### 7.2 Web Tarayıcıda Test
```
1. https://cliff.kynux.dev → Frontend açılmalı
2. https://cliff.kynux.dev/api/health → Backend health check
3. https://cliff.kynux.dev/api/v1/docs → API documentation
```

### 7.3 Otomatik Deployment Test
```powershell
# Küçük bir değişiklik yapın
cd C:\inetpub\wwwroot\cliff
echo "Deployment test $(Get-Date)" >> test.txt
git add test.txt
git commit -m "test: otomatik deployment"
git push origin main

# GitHub Actions'ı izleyin
# Repository → Actions → Son workflow run
```

---

## 📊 Yönetim Komutları

### PM2 Komutları
```powershell
# Servisleri göster
pm2 status

# Logları göster
pm2 logs

# Belirli bir servisin logları
pm2 logs cliff-backend
pm2 logs cliff-frontend
pm2 logs cliff-webhook

# Servisi yeniden başlat
pm2 restart cliff-backend
pm2 restart cliff-frontend
pm2 restart all

# Servisi durdur
pm2 stop cliff-backend

# Servisi sil
pm2 delete cliff-backend

# Tüm servisleri kaydet
pm2 save

# PM2 resurrection (otomatik başlatma)
pm2 startup
pm2 save
```

### Nginx Komutları
```powershell
cd C:\nginx

# Test
.\nginx.exe -t

# Reload
.\nginx.exe -s reload

# Restart
.\nginx.exe -s quit
Start-Process nginx

# Veya Windows servisi olarak
Restart-Service nginx
Stop-Service nginx
Start-Service nginx
```

### Manuel Deployment
```powershell
cd C:\inetpub\wwwroot\cliff

# PowerShell script ile
.\deploy.ps1

# Veya manuel
git pull origin main
cd backend
pip install -r requirements.txt
cd ..\frontend
npm install
npm run build
cd ..
pm2 restart all
```

---

## 🔧 Sorun Giderme

### Backend Başlamıyor
```powershell
# Logları kontrol edin
pm2 logs cliff-backend --lines 100

# Manuel başlatmayı deneyin
cd C:\inetpub\wwwroot\cliff\backend
python main.py

# Port çakışması kontrolü
netstat -ano | findstr "8001"
```

### Frontend Başlamıyor
```powershell
# Logları kontrol edin
pm2 logs cliff-frontend --lines 100

# Build hatası varsa
cd C:\inetpub\wwwroot\cliff\frontend
npm run build

# Port kontrolü
netstat -ano | findstr "3001"
```

### Nginx 502 Bad Gateway
```powershell
# Backend'in çalıştığını kontrol edin
pm2 status

# Backend'i manuel test edin
curl http://localhost:8001/health

# Nginx error log
Get-Content C:\nginx\logs\error.log -Tail 50
```

### Webhook Çalışmıyor
```powershell
# Webhook listener logları
pm2 logs cliff-webhook

# Port kontrolü
netstat -ano | findstr "9000"

# Manuel webhook testi
curl -X POST http://localhost:9000/webhook
```

---

## ✅ Kurulum Tamamlandı!

Artık:
- ✅ GitHub'a her push yapışınızda otomatik deploy olacak
- ✅ https://cliff.kynux.dev üzerinden erişilebilir
- ✅ SSL sertifikası otomatik yenilenecek
- ✅ PM2 servisleri otomatik yönetecek

**Deployment Akışı:**
1. Kod yazıyorsunuz
2. `git push origin main`
3. GitHub Actions webhook tetikliyor
4. VDS'deki webhook-listener alıyor
5. `deploy.ps1` çalışıyor
6. PM2 servisleri restart ediyor
7. Site güncel! 🚀


# Cliff Otomatik Deployment Script
$ErrorActionPreference = "Stop"

Write-Host "🚀 CLIFF Deployment Başlatılıyor..." -ForegroundColor Green

# Git pull
Write-Host "📥 Son değişiklikler çekiliyor..." -ForegroundColor Cyan
cd C:\inetpub\wwwroot\cliff
git pull origin main

# Backend güncelleme
Write-Host "🐍 Backend güncelleniyor..." -ForegroundColor Yellow
cd backend
pip install -r requirements.txt --quiet

# Frontend güncelleme
Write-Host "⚛️ Frontend build ediliyor..." -ForegroundColor Blue
cd ..\frontend
npm install --quiet
npm run build

# Servisleri yeniden başlatma
Write-Host "🔄 Servisler yeniden başlatılıyor..." -ForegroundColor Magenta
pm2 restart all

Write-Host "✅ Deployment tamamlandı!" -ForegroundColor Green
Write-Host "🌐 Site: https://cliff.kynux.dev" -ForegroundColor Cyan

## CLIFF — Windows production deployment helper.
## Pulls latest, refreshes deps, rebuilds frontend, restarts pm2 apps.

$ErrorActionPreference = "Stop"

Write-Host "==> CLIFF deploy starting" -ForegroundColor Cyan

$root = if ($env:CLIFF_DEPLOY_ROOT) { $env:CLIFF_DEPLOY_ROOT } else { "C:\inetpub\wwwroot\cliff" }
Set-Location $root
Write-Host "    root: $root" -ForegroundColor DarkGray

Write-Host "==> git pull" -ForegroundColor Yellow
git pull origin main

Write-Host "==> backend deps" -ForegroundColor Yellow
Set-Location "$root\backend"
pip install -r requirements.txt --quiet --disable-pip-version-check

Write-Host "==> frontend build" -ForegroundColor Yellow
Set-Location "$root\frontend"
npm ci --no-audit --no-fund
npm run build

Write-Host "==> pm2 restart" -ForegroundColor Yellow
Set-Location $root
pm2 reload ecosystem.config.js --update-env

Write-Host "==> done" -ForegroundColor Green
Write-Host "    https://cliff.kynux.dev" -ForegroundColor Cyan

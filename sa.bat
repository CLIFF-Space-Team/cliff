# Lokal bilgisayar
cd C:\Users\Kynux\Desktop\Nasa test\Tubitak

# lib klasörünün ignore edilmediğinden emin olun
git check-ignore frontend/lib
# Çıktı yoksa, artık ignore edilmiyor demektir

# frontend/lib klasörünü ekleyin
git add frontend/lib/ -f
git add .gitignore

# Commit
git commit -m "fix: frontend/lib klasörü eklendi (.gitignore düzeltildi)"

# Push
git push origin 2025-11-01-u6pu-5ed9e
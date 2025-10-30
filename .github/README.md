# GitHub Actions & Rulesets Konfigürasyonu

Bu klasör CLIFF projesinin GitHub entegrasyonlarını içerir.

## 📁 Dosya Yapısı

```
.github/
├── workflows/          # GitHub Actions CI/CD workflow'ları
│   ├── backend-ci.yml
│   ├── frontend-ci.yml
│   └── security-scan.yml
├── rulesets/          # Branch koruma kuralları
│   ├── main-branch-protection.json
│   ├── dev-branch-protection.json
│   └── feature-branch-protection.json
├── CODEOWNERS         # Kod sahipleri tanımları
└── README.md          # Bu dosya
```

## 🚀 Workflows

### Backend CI/CD (`backend-ci.yml`)
**Tetikleyiciler:**
- `main`, `develop`, `feature/**` branch'lerine push
- `main`, `develop` branch'lerine PR

**Jobs:**
- **ci/backend:lint** - Black, isort, flake8
- **ci/backend:test** - pytest testleri
- **ci/backend:coverage** - Test coverage analizi

### Frontend CI/CD (`frontend-ci.yml`)
**Tetikleyiciler:**
- `main`, `develop`, `feature/**` branch'lerine push
- `main`, `develop` branch'lerine PR

**Jobs:**
- **ci/frontend:lint** - ESLint, TypeScript kontrolü
- **ci/frontend:test** - Vitest testleri
- **ci/frontend:build** - Next.js build
- **ci/frontend:coverage** - Test coverage analizi

### Security Scan (`security-scan.yml`)
**Tetikleyiciler:**
- `main`, `develop` branch'lerine push/PR
- Her Pazar gece yarısı (zamanlanmış)

**Jobs:**
- **ci/security:scan** - Trivy güvenlik taraması

## 🔐 Rulesets

### Main Branch Protection
**Hedef:** `main`, `master`

**Kurallar:**
- ✅ PR zorunlu (2 approval)
- ✅ Tüm CI check'ler geçmeli
- ✅ Code owner review zorunlu
- ✅ Force push engelli
- ✅ Branch silme engelli
- ✅ Linear history zorunlu
- ✅ İmzalı commit zorunlu

### Development Branch Protection
**Hedef:** `develop`, `dev`

**Kurallar:**
- ✅ PR zorunlu (1 approval)
- ✅ Test ve build check'leri
- ✅ Linear history önerili
- ✅ Force push engelli

### Feature Branch Protection
**Hedef:** `feature/**`, `fix/**`

**Kurallar:**
- ✅ Lint check'leri
- ✅ Force push engelli

## 🔧 Kurulum

### 1. GitHub Secrets Ekleyin
Repository Settings → Secrets and Variables → Actions:

```
NASA_API_KEY=your_nasa_api_key_here
```

### 2. Rulesets'i Aktifleştirin
Repository Settings → Rules → Rulesets:

1. **New ruleset** → **Import a ruleset**
2. `rulesets/` klasöründeki JSON dosyalarını yükleyin
3. Her birini aktif edin

### 3. Branch'leri Oluşturun
```bash
# Develop branch oluştur
git checkout -b develop
git push origin develop

# Feature branch örneği
git checkout -b feature/yeni-ozellik
git push origin feature/yeni-ozellik
```

## 📊 Status Checks

Rulesets'te tanımlı status check'ler:

| Check | Açıklama |
|-------|----------|
| `ci/backend:lint` | Backend kod kalitesi |
| `ci/backend:test` | Backend testleri |
| `ci/backend:coverage` | Backend coverage |
| `ci/frontend:lint` | Frontend kod kalitesi |
| `ci/frontend:test` | Frontend testleri |
| `ci/frontend:build` | Frontend build |
| `ci/frontend:coverage` | Frontend coverage |
| `ci/security:scan` | Güvenlik taraması |

## 👥 CODEOWNERS

`.github/CODEOWNERS` dosyası PR'larda otomatik reviewer atamak için kullanılır.

**Örnek:**
```
/backend/ @kynuxdev
/frontend/ @kynuxdev
```

## 🎯 Workflow Kullanımı

### Pull Request Süreci

1. **Feature branch oluştur:**
```bash
git checkout -b feature/yeni-ozellik
```

2. **Değişiklikleri commit et:**
```bash
git add .
git commit -m "feat(frontend): yeni özellik eklendi"
git push origin feature/yeni-ozellik
```

3. **GitHub'da PR oluştur:**
- `develop` branch'ine PR aç
- Otomatik olarak linter ve test check'leri çalışır
- CODEOWNERS'a göre reviewer atanır

4. **Review ve Merge:**
- Review'ları al
- Tüm check'ler yeşil olmalı
- Merge yap

## 🐛 Sorun Giderme

### Workflow çalışmıyor
- Actions sekmesini kontrol edin
- Workflow dosyalarında syntax hatası var mı?
- Repository permissions: Settings → Actions → General → Workflow permissions

### Status check başarısız
- Actions logs'ları inceleyin
- Lokal olarak testleri çalıştırın:
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Ruleset çalışmıyor
- Ruleset'ler sadece GitHub Team organization'da aktif çalışır
- Private repo'da test amaçlı olarak eklenebilir

## 📚 Kaynaklar

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)


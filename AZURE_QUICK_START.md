# ⚡ Azure AI Agent - Hızlı Başlangıç

## 🚀 5 Dakikada Başla (CLI Olmadan!)

### 1️⃣ Paketleri Yükle
```bash
cd backend
pip install azure-ai-projects azure-identity
```

### 2️⃣ API Key Al

1. [Azure Portal](https://portal.azure.com) → Azure AI Projects
2. **"Keys and Endpoint"** bölümüne git
3. **API Key**'i kopyala

### 3️⃣ .env Dosyasını Yapılandır

`backend/.env` dosyasını oluştur veya düzenle:

```env
# Azure AI Agent
AZURE_API_KEY=buraya-api-key-yapistir
AZURE_AI_ENDPOINT=https://kynux-mhgmg52x-eastus2.services.ai.azure.com/api/projects/kynux-mhgmg52x-eastus2-project
AZURE_AGENT_ID=asst_AJg6SvBS1cDAnzJLl53ht6rs
```

### 4️⃣ Test Et

```bash
python test_azure_agent.py
```

✅ Çalışıyorsa:
```
✅ Azure AI Agent Service initialized
Servis kullanılabilir: True
```

### 5️⃣ Kullan!

**Backend başlat:**
```bash
uvicorn main:app --reload
```

**Frontend'de:**
1. `http://localhost:3000/chat-demo` aç
2. "🧠 Grok AI Aktif" → tıkla
3. "🤖 Azure Agent Aktif" ← şuna geçti
4. Mesaj yaz ve gönder! 🎉

---

## 🔍 Sorun mu var?

### ❌ "Authentication failed"

```bash
# API Key doğru mu kontrol et
echo $AZURE_API_KEY
```

**Çözüm:** `.env` dosyasında `AZURE_API_KEY=` satırını kontrol et

### ❌ "Package not found"

```bash
pip install azure-ai-projects azure-identity --upgrade
```

### ❌ "Agent not found"

**Çözüm:** `AZURE_AGENT_ID` doğru mu kontrol et

---

## 📖 Detaylı Kılavuzlar

- **Tam Kurulum:** [AZURE_AI_AGENT_SETUP.md](./AZURE_AI_AGENT_SETUP.md)
- **CLI Olmadan:** [AZURE_AI_AGENT_NO_CLI.md](./AZURE_AI_AGENT_NO_CLI.md)

---

## 💡 İpucu

`.env` dosyasını Git'e commit etme!

```bash
echo ".env" >> .gitignore
```

---

**Hazırsın! Azure AI Agent219 ile konuşmaya başla! 🤖✨**


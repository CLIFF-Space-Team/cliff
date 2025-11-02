# 🔑 Azure AI Agent - CLI Olmadan Kullanım

Azure CLI'ye erişiminiz yoksa endişelenmeyin! Bu kılavuz, Azure CLI kullanmadan Azure AI Agent'ı nasıl yapılandıracağınızı gösterir.

## 📋 Kimlik Doğrulama Seçenekleri

Servis, aşağıdaki kimlik doğrulama yöntemlerini **öncelik sırasına göre** dener:

1. **API Key** (En kolay - önerilen)
2. **Service Principal** (Production için önerilen)
3. **DefaultAzureCredential** (Azure CLI gerektirir)

## 🔑 Yöntem 1: API Key ile Kullanım (ÖNERİLEN - CLI Gerekmez!)

### Adım 1: Azure Portal'dan API Key Alın

1. [Azure Portal](https://portal.azure.com)'a gidin
2. Azure AI Projects'inize gidin
3. "Keys and Endpoint" bölümüne gidin
4. API Key'i kopyalayın

### Adım 2: .env Dosyasını Yapılandırın

```bash
cd backend
```

`.env` dosyanıza şunları ekleyin:

```env
# Azure AI Agent - API Key Authentication (CLI GEREKMEZ!)
AZURE_API_KEY=your-api-key-here
AZURE_AI_ENDPOINT=https://kynux-mhgmg52x-eastus2.services.ai.azure.com/api/projects/kynux-mhgmg52x-eastus2-project
AZURE_AGENT_ID=asst_AJg6SvBS1cDAnzJLl53ht6rs
```

### Adım 3: Test Edin

```bash
python test_azure_agent.py
```

✅ **TAMAMDIR!** Azure CLI olmadan çalışacak.

---

## 🔐 Yöntem 2: Service Principal ile Kullanım (Production için)

Service Principal oluşturmak için Azure Portal erişimi yeterlidir.

### Adım 1: Service Principal Oluşturun

#### Azure Portal'dan:

1. [Azure Portal](https://portal.azure.com) → Azure Active Directory
2. "App registrations" → "New registration"
3. Uygulama adı: "CLIFF-Agent-Access"
4. "Register" tıklayın

#### Değerleri Kaydedin:

- **Application (client) ID**: `xxxxx-xxxxx-xxxxx-xxxxx`
- **Directory (tenant) ID**: `xxxxx-xxxxx-xxxxx-xxxxx`

#### Client Secret Oluşturun:

1. "Certificates & secrets" → "New client secret"
2. Description: "CLIFF Backend Access"
3. Expires: 24 months (veya istediğiniz süre)
4. "Add" tıklayın
5. **Secret Value**'yu kopyalayın (sadece bir kez gösterilir!)

#### İzinleri Ayarlayın:

1. Azure AI Projects'inize gidin
2. "Access Control (IAM)" → "Add role assignment"
3. Role: "Azure AI Developer" veya "Cognitive Services User"
4. Assign access to: "User, group, or service principal"
5. Select: Oluşturduğunuz uygulamayı seçin
6. "Review + assign"

### Adım 2: .env Dosyasını Yapılandırın

```env
# Azure AI Agent - Service Principal Authentication (CLI GEREKMEZ!)
AZURE_CLIENT_ID=your-application-client-id
AZURE_CLIENT_SECRET=your-client-secret-value
AZURE_TENANT_ID=your-tenant-id
AZURE_AI_ENDPOINT=https://kynux-mhgmg52x-eastus2.services.ai.azure.com/api/projects/kynux-mhgmg52x-eastus2-project
AZURE_AGENT_ID=asst_AJg6SvBS1cDAnzJLl53ht6rs
```

### Adım 3: Test Edin

```bash
python test_azure_agent.py
```

✅ **TAMAMDIR!** Güvenli ve production-ready!

---

## 📝 Tam .env Örneği

```env
# ===========================================
# AZURE AI AGENT CONFIGURATION
# ===========================================

# Yöntem 1: API Key (En Kolay - CLI Gerekmez)
AZURE_API_KEY=your-api-key-here

# Yöntem 2: Service Principal (Production için - CLI Gerekmez)
# AZURE_CLIENT_ID=your-application-client-id
# AZURE_CLIENT_SECRET=your-client-secret-value
# AZURE_TENANT_ID=your-tenant-id

# Agent Configuration (Her iki yöntem için gerekli)
AZURE_AI_ENDPOINT=https://kynux-mhgmg52x-eastus2.services.ai.azure.com/api/projects/kynux-mhgmg52x-eastus2-project
AZURE_AGENT_ID=asst_AJg6SvBS1cDAnzJLl53ht6rs

# ===========================================
# DİĞER AYARLAR
# ===========================================

# NASA API
NASA_API_KEY=DEMO_KEY

# Veritabanı
MONGODB_URL=mongodb://localhost:27017/cliff_db
REDIS_URL=redis://localhost:6379/0
```

---

## 🧪 Test ve Doğrulama

### Test Script'i Çalıştırın:

```bash
cd backend
python test_azure_agent.py
```

### Beklenen Çıktı:

```
🚀 ============================================================ 🚀
🚀 AZURE AI AGENT TEST SÜİTİ                              🚀
🚀 ============================================================ 🚀

============================================================
🧪 Test 1: Servis Başlatma
============================================================
🔑 Using Azure API Key authentication
✅ Azure AI Agent Service initialized
Servis kullanılabilir: True
✅ Servis başarıyla başlatıldı

Servis Bilgileri:
  service: Azure AI Agent
  available: True
  endpoint: https://kynux-mhgmg52x-eastus2.services.ai.azure.com/...
  agent_id: asst_AJg6SvBS1cDAnzJLl53ht6rs
  packages_installed: True
```

### Sorun mu var?

```bash
# Hangi kimlik doğrulama metodunun kullanıldığını kontrol edin
python -c "
from app.services.azure_ai_agent_service import get_azure_agent_service
service = get_azure_agent_service()
print(f'Service Available: {service.is_available}')
"
```

---

## 🔍 Sorun Giderme

### ❌ "Azure CLI not found" hatası

**Çözüm:** API Key veya Service Principal kullanın. `.env` dosyanızda `AZURE_API_KEY` veya Service Principal bilgilerini ekleyin.

### ❌ "Authentication failed" hatası

**API Key için:**
```bash
# API Key'in doğru olduğunu kontrol edin
echo $AZURE_API_KEY
# veya Windows'ta:
echo %AZURE_API_KEY%
```

**Service Principal için:**
```bash
# Tüm değerlerin ayarlandığını kontrol edin
echo $AZURE_CLIENT_ID
echo $AZURE_TENANT_ID
# Client secret'ı echo etmeyin (güvenlik)
```

### ❌ "Agent not found" hatası

```bash
# Agent ID'nin doğru olduğunu kontrol edin
echo $AZURE_AGENT_ID
```

### ❌ "Endpoint not accessible" hatası

**Kontrol Listesi:**
1. Internet bağlantınız var mı?
2. Endpoint URL doğru mu?
3. Azure Portal'da service çalışıyor mu?
4. Firewall/VPN sorunları var mı?

---

## 🚀 Kullanıma Başlama

### Backend'i Başlatın:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### API Testi:

```bash
# Status kontrolü
curl http://localhost:8000/api/v1/ai/azure-agent/status

# Mesaj gönderme
curl -X POST http://localhost:8000/api/v1/ai/azure-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Merhaba Agent219!"
  }'
```

### Frontend'de Kullanım:

1. `http://localhost:3000/chat-demo` sayfasına gidin
2. "🧠 Grok AI Aktif" butonuna tıklayın
3. "🤖 Azure Agent Aktif" moduna geçin
4. Mesaj gönderin!

---

## 💡 Öneriler

### Development için:
- ✅ API Key kullanın (hızlı ve kolay)
- ✅ `.env` dosyasında saklayın
- ⚠️ Git'e commit etmeyin!

### Production için:
- ✅ Service Principal kullanın
- ✅ Azure Key Vault'ta saklayın
- ✅ Managed Identity kullanmayı düşünün
- ✅ Secrets rotation uygulayın

### Güvenlik:
```bash
# .gitignore'a ekleyin
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
```

---

## 📞 Yardım

Hala sorun mu yaşıyorsunuz?

1. Backend loglarını kontrol edin
2. `.env` dosyasının doğru konumda olduğundan emin olun
3. Environment variables'ların yüklendiğini doğrulayın
4. Test script'ini verbose mode'da çalıştırın

```bash
# Detaylı log ile test
DEBUG=true python test_azure_agent.py
```

---

## ✅ Özet

| Yöntem | CLI Gerekir mi? | Zorluk | Production-Ready |
|--------|----------------|---------|------------------|
| API Key | ❌ Hayır | ⭐ Kolay | ⚠️ Dikkatli kullanın |
| Service Principal | ❌ Hayır | ⭐⭐ Orta | ✅ Evet |
| Azure CLI | ✅ Evet | ⭐⭐⭐ Zor | ❌ Hayır |

**Önerimiz:** Development için **API Key**, Production için **Service Principal** kullanın.

---

**Not:** Azure CLI'ye ihtiyacınız yok! API Key veya Service Principal ile Azure AI Agent'ı kullanabilirsiniz. 🎉


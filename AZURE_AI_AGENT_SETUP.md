# 🤖 Azure AI Agent Entegrasyonu

Bu doküman, CLIFF AI sistemine Azure AI Agent (Agent219) entegrasyonu için kurulum ve kullanım talimatlarını içerir.

## 📋 Gereksinimler

### Python Paketleri

Backend için aşağıdaki paketleri yükleyin:

```bash
cd backend
pip install azure-ai-projects azure-identity
```

veya requirements.txt'den yükleyin:

```bash
pip install -r requirements.txt
```

### Azure Credentials

> **⚠️ Azure CLI'ye erişiminiz yok mu?**  
> Sorun değil! **[CLI Olmadan Kullanım Kılavuzu](./AZURE_AI_AGENT_NO_CLI.md)** sayfasına bakın.

Azure AI Agent için **3 kimlik doğrulama seçeneği** vardır:

#### 1. API Key (En Kolay - CLI Gerekmez ✅)

```bash
# .env dosyanıza ekleyin
AZURE_API_KEY=your-api-key-here
```

**Azure Portal'dan API Key nasıl alınır:**
1. [Azure Portal](https://portal.azure.com) → Azure AI Projects
2. "Keys and Endpoint" → API Key'i kopyalayın
3. `.env` dosyanıza ekleyin

#### 2. Service Principal (Production için - CLI Gerekmez ✅)

```bash
# .env dosyanıza ekleyin
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

**Service Principal nasıl oluşturulur:** [Detaylı Kılavuz](./AZURE_AI_AGENT_NO_CLI.md#-yöntem-2-service-principal-ile-kullanım-production-için)

#### 3. Azure CLI (Opsiyonel)

```bash
az login
```

## ⚙️ Yapılandırma

### Backend Konfigürasyonu

Backend'de `.env` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# Azure AI Agent Configuration
AZURE_AI_ENDPOINT=https://kynux-mhgmg52x-eastus2.services.ai.azure.com/api/projects/kynux-mhgmg52x-eastus2-project
AZURE_AGENT_ID=asst_AJg6SvBS1cDAnzJLl53ht6rs
```

### Environment Variables (Opsiyonel)

Eğer farklı bir endpoint veya agent kullanmak isterseniz:

```python
export AZURE_AI_ENDPOINT="your-custom-endpoint"
export AZURE_AGENT_ID="your-agent-id"
```

## 🚀 Kullanım

### Backend API Endpoints

#### 1. Tek Mesaj Gönderme

```bash
POST /api/v1/ai/azure-agent/chat
Content-Type: application/json

{
  "message": "Merhaba Agent219",
  "thread_id": null  // İlk mesaj için null, sonraki mesajlar için önceki thread_id
}
```

**Response:**
```json
{
  "success": true,
  "content": "Merhaba! Size nasıl yardımcı olabilirim?",
  "thread_id": "thread_abc123xyz",
  "response_time_ms": 1234,
  "timestamp": "2025-11-01T12:00:00Z",
  "provider": "azure_ai_agent"
}
```

#### 2. Konuşma Geçmişi ile Mesaj

```bash
POST /api/v1/ai/azure-agent/conversation
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Uzay hakkında bilgi ver"
    },
    {
      "role": "assistant",
      "content": "Uzay, gezegenler ve yıldızlardan oluşan..."
    },
    {
      "role": "user",
      "content": "Peki Mars hakkında ne söyleyebilirsin?"
    }
  ],
  "thread_id": "thread_abc123xyz"
}
```

#### 3. Servis Durumu Kontrolü

```bash
GET /api/v1/ai/azure-agent/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "service": "Azure AI Agent",
    "available": true,
    "endpoint": "https://kynux-mhgmg52x-eastus2.services.ai.azure.com/...",
    "agent_id": "asst_AJg6SvBS1cDAnzJLl53ht6rs",
    "packages_installed": true
  },
  "timestamp": "2025-11-01T12:00:00Z"
}
```

### Frontend Kullanımı

Chat arayüzünde Azure Agent ile konuşmak için:

1. Chat penceresini açın (`/chat-demo` sayfası)
2. Header'daki **"🧠 Grok AI Aktif"** butonuna tıklayın
3. Buton **"🤖 Azure Agent Aktif"** olarak değişecek
4. Artık mesajlarınız Azure AI Agent219'a gönderilecek
5. Thread ID otomatik olarak saklanır, konuşma sürekliliği sağlanır

#### Örnek Kullanım:

```typescript
// ModernChatInterface kullanımı
import ModernChatInterface from '@/components/chat/ModernChatInterface'

function ChatPage() {
  return (
    <ModernChatInterface 
      isOpen={true}
      onClose={() => {}}
    />
  )
}
```

## 🔍 Test Etme

### Backend Test

```bash
cd backend
python -c "
from app.services.azure_ai_agent_service import get_azure_agent_service

service = get_azure_agent_service()
print('Service available:', service.is_available)
print('Service info:', service.get_service_info())
"
```

### API Test (cURL)

```bash
# Status kontrolü
curl -X GET http://localhost:8000/api/v1/ai/azure-agent/status

# Mesaj gönderme
curl -X POST http://localhost:8000/api/v1/ai/azure-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Merhaba Agent219!"
  }'
```

## 📊 Özellikler

### ✅ Desteklenen Özellikler

- ✅ Thread tabanlı konuşma yönetimi
- ✅ Otomatik thread ID saklama
- ✅ Konuşma geçmişi
- ✅ Hata yönetimi ve fallback
- ✅ Response time tracking
- ✅ Frontend toggle (Grok AI ↔ Azure Agent)
- ✅ Retry mekanizması

### 🔄 Thread Yönetimi

Azure Agent, konuşmaları "thread" bazında yönetir:

1. İlk mesajınızda `thread_id: null` gönderin
2. Response'da dönen `thread_id`'yi saklayın
3. Sonraki mesajlarda bu `thread_id`'yi kullanın
4. Frontend'de otomatik olarak saklanır

### ⚠️ Dikkat Edilmesi Gerekenler

1. **Azure Credentials**: Azure kimlik bilgilerinizin doğru yapılandırıldığından emin olun
2. **Endpoint URL**: Endpoint URL'inizin doğru olduğundan emin olun
3. **Agent ID**: Agent ID'nizin aktif olduğundan emin olun
4. **Rate Limits**: Azure AI servislerin rate limit'lerine dikkat edin

## 🐛 Sorun Giderme

### Paket bulunamadı hatası

```bash
pip install azure-ai-projects azure-identity --upgrade
```

### Authentication hatası

```bash
# Azure CLI ile tekrar giriş yapın
az login
az account show
```

### Agent bulunamadı hatası

`.env` dosyasındaki `AZURE_AGENT_ID`'nin doğru olduğundan emin olun:

```bash
echo $AZURE_AGENT_ID
```

### Servis kullanılamıyor

Backend loglarını kontrol edin:

```bash
# Backend'i debug mode'da çalıştırın
cd backend
uvicorn main:app --reload --log-level debug
```

## 📝 Örnek Kod

### Python Backend

```python
from app.services.azure_ai_agent_service import (
    get_azure_agent_service,
    AzureAgentRequest,
    AzureAgentMessage
)

# Servis instance'ını al
service = get_azure_agent_service()

# İstek oluştur
request = AzureAgentRequest(
    messages=[
        AzureAgentMessage(
            role="user",
            content="Uzay hakkında bilgi ver"
        )
    ]
)

# Yanıt al
response = await service.chat_completion(request)

if response.success:
    print(f"Agent: {response.content}")
    print(f"Thread ID: {response.thread_id}")
else:
    print(f"Hata: {response.error_message}")
```

### TypeScript Frontend

```typescript
async function sendToAzureAgent(message: string, threadId?: string) {
  const response = await fetch('/api/v1/ai/azure-agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      thread_id: threadId
    })
  })
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Agent yanıtı:', data.content)
    console.log('Thread ID:', data.thread_id)
    return data
  } else {
    console.error('Hata:', data.error)
    return null
  }
}
```

## 🔗 Faydalı Linkler

- [Azure AI Projects Documentation](https://learn.microsoft.com/en-us/azure/ai-services/)
- [Azure Identity Documentation](https://learn.microsoft.com/en-us/python/api/azure-identity/)
- [CLIFF AI Documentation](./README.md)

## 📞 Destek

Sorunlarla karşılaşırsanız:

1. Backend loglarını kontrol edin
2. Azure servis durumunu kontrol edin
3. Environment variables'ları doğrulayın
4. `/api/v1/ai/azure-agent/status` endpoint'ini test edin

---

**Not:** Bu entegrasyon, mevcut Grok AI sisteminize ek olarak çalışır. İstediğiniz zaman aralarında geçiş yapabilirsiniz.

